import { type NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma/prisma";
import type Stripe from "stripe";

export async function POST(_req: NextRequest) {
    try {
        const authResult = await checkAdminAuth();
        if (!authResult.authorized || !authResult.user) {
            return forbiddenResponse(authResult.error);
        }

        const user = await prisma.user.findUnique({
            where: { id: authResult.user.id },
            include: { adminProfile: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        let accountId = user.adminProfile?.stripeConnectId;

        // 1. Create Stripe Account if not exists
        if (!accountId) {
            const firstName = user.name?.split(" ")[0] || "";
            const lastName = user.name?.split(" ").slice(1).join(" ") || "";
            
            const accountParams: Stripe.AccountCreateParams = {
                type: 'express',
                email: user.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    mcc: '5399',
                    url: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443",
                },
                individual: {
                    email: user.email,
                    first_name: firstName,
                    last_name: lastName,
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

            const account = await stripe.accounts.create(accountParams);
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
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
