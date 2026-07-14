import { type NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma/prisma";
import { resolveIsoCountryCode } from "@/lib/stripe/countryCode";
import Stripe from "stripe";

// Stripe's business_profile.url validator rejects hosts with no recognized
// public suffix (e.g. the .localhost TLD used by some local dev domains),
// even though they're syntactically valid URLs.
function isStripeAcceptableUrl(url: string): boolean {
    try {
        const { hostname } = new URL(url);
        return hostname !== "localhost" && !hostname.endsWith(".localhost") && hostname !== "127.0.0.1";
    } catch {
        return false;
    }
}

export async function POST(_req: NextRequest) {
    try {
        const authResult = await checkAdminAuth();
        if (!authResult.authorized || !authResult.user) {
            return forbiddenResponse(authResult.error);
        }

        const user = await prisma.user.findUnique({
            where: { id: authResult.user.id },
            include: {
                adminProfile: {
                    include: { organizationsOwned: { take: 1, select: { name: true } } }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let accountId = user.adminProfile?.stripeConnectId;

        // 1. Create Stripe Account if not exists
        if (!accountId) {
            // legalName is the vetted identity field (collected by
            // RegisterWizard/CompleteProfileWizard); name is just a display
            // name and for SSO signups can be a GitHub username with no
            // space at all, so prefer legalName for Stripe's KYC name.
            const fullName = user.legalName || user.name || "";
            const firstName = fullName.split(" ")[0] || "";
            const lastName = fullName.split(" ").slice(1).join(" ") || "";
            const siteUrl = process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443";
            const countryCode = resolveIsoCountryCode(user.addressCountry);
            const orgName = user.adminProfile?.organizationsOwned[0]?.name;

            const accountParams: Stripe.AccountCreateParams = {
                type: 'express',
                email: user.email,
                ...(countryCode ? { country: countryCode } : {}),
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    mcc: '5399',
                    name: orgName || fullName || undefined,
                    product_description: "Event ticketing and registration",
                    ...(isStripeAcceptableUrl(siteUrl) ? { url: siteUrl } : {}),
                },
                individual: {
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName,
                    ...(countryCode && user.addressLine1 && user.addressCity && user.addressPostalCode
                        ? {
                            address: {
                                line1: user.addressLine1,
                                line2: user.addressLine2 || undefined,
                                city: user.addressCity,
                                state: user.addressState || undefined,
                                postal_code: user.addressPostalCode,
                                country: countryCode,
                            },
                        }
                        : {}),
                }
            };

            // Pre-fill DOB if available
            if (user.dateOfBirth && accountParams.individual) {
                const dob = new Date(user.dateOfBirth);
                accountParams.individual.dob = {
                    day: dob.getDate(),
                    month: dob.getMonth() + 1,
                    year: dob.getFullYear(),
                };
            }

            // addressPostalCode/addressCountry are freeform text with no
            // offline validation, so Stripe can still reject them (e.g.
            // postal_code_invalid) even after resolveIsoCountryCode() maps
            // a country name. Retry once without the address block rather
            // than failing the whole signup — the hosted onboarding form
            // just asks for it directly instead.
            const account = await stripe.accounts.create(accountParams).catch(async (err) => {
                const isAddressError =
                    err instanceof Stripe.errors.StripeError &&
                    typeof err.param === "string" &&
                    err.param.startsWith("individual[address]");
                if (!isAddressError || !accountParams.individual) throw err;

                console.warn("Stripe rejected prefilled address, retrying without it:", err.message);
                const { address: _address, ...individualWithoutAddress } = accountParams.individual;
                return stripe.accounts.create({ ...accountParams, individual: individualWithoutAddress });
            });
            accountId = account.id;

            await prisma.admin.upsert({
                where: { userId: user.id },
                create: { userId: user.id, stripeConnectId: accountId },
                update: { stripeConnectId: accountId }
            });
        }

        // 2. Create Account Session for embedded onboarding
        const accountSession = await stripe.accountSessions.create({
            account: accountId,
            components: {
                account_onboarding: { enabled: true },
                payments: { 
                    enabled: true, 
                    features: { 
                        refund_management: true, 
                        dispute_management: true,
                        capture_payments: true
                    } 
                },
                payouts: { 
                    enabled: true,
                    features: {
                        instant_payouts: true,
                        standard_payouts: true,
                        edit_payout_schedule: true,
                        external_account_collection: true
                    }
                },
                balances: { 
                    enabled: true,
                    features: {
                        instant_payouts: true,
                        standard_payouts: true,
                        edit_payout_schedule: true
                    }
                },
                account_management: { 
                    enabled: true,
                    features: {
                        external_account_collection: true
                    } 
                },
                notification_banner: { enabled: true },
            },
        });

        return NextResponse.json({ clientSecret: accountSession.client_secret });

    } catch (error) {
        console.error("Error creating stripe connect session:", error);
        const message =
            error instanceof Stripe.errors.StripeError
                ? `${error.type}: ${error.message}`
                : error instanceof Error
                    ? error.message
                    : "Internal Server Error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
