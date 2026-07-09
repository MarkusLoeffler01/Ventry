import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";
import { lastLoginMethod, twoFactor, multiSession } from "better-auth/plugins";
import { hashPassword } from "@/lib/bcrypt";
import { verifyPassword } from "@/lib/auth/verify";
import { sendMail } from "@/lib/mail";
import { renderComponentToHTML } from "@/lib/helpers/html";
import WelcomeMail from "@/components/emails/WelcomeMail";
import EmailVerificationMail from "@/components/emails/EmailVerificationMail";
import { getTrustedOrigins } from "@/lib/security/origins";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/user/display-name";

const cookiePrefix = "VENTRY";

function clampDisplayName(name: string | null | undefined) {
    return name?.slice(0, DISPLAY_NAME_MAX_LENGTH);
}

export const auth = betterAuth({
    rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // limit each IP to 100 requests per windowMs
    },
    advanced: {
        cookiePrefix,
    },
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443",
    trustedOrigins: getTrustedOrigins(),
    secret: process.env.BETTER_AUTH_SECRET,
    plugins: [
        passkey(),
        lastLoginMethod(),
        multiSession(),
        // REMOVED nextCookies() - causes state_mismatch with custom domains
        twoFactor({
            otpOptions: {
                async sendOTP({ user: _user, otp: _otp }, _request) {
                    // TODO: Send email

                },
            }
        })
    ],
    session: {},
    user: {
        additionalFields: {
            isAdmin: {
                type: "boolean",
                required: false,
                defaultValue: false,
                input: false, // not settable by users
            },
            legalName: {
                type: "string",
                required: false,
            },
            addressLine1: {
                type: "string",
                required: false,
                returned: false,
            },
            addressLine2: {
                type: "string",
                required: false,
                returned: false,
            },
            addressCity: {
                type: "string",
                required: false,
                returned: false,
            },
            addressState: {
                type: "string",
                required: false,
                returned: false,
            },
            addressPostalCode: {
                type: "string",
                required: false,
                returned: false,
            },
            addressCountry: {
                type: "string",
                required: false,
                returned: false,
            }
        }
    },
    account: {
        accountLinking: {
            enabled: true, // Enable - but we control it via allow_oauth_linking cookie
            trustedProviders: ["github", "google"]
        }
    },
    emailVerification: {
        sendOnSignUp: true, // TODO: Set to true
        sendOnSignIn: false,
        expiresIn: 24 * 60 * 60, // 24 hours (correct property name)

        fromEmail: process.env.SMTP_FROM || "<ventry@m-loeffler.de>",
        autoSignInAfterVerification: true,

        sendVerificationEmail: async ({ user, url }) => {
            // Rewrite the callbackURL so users land on /?status=email_verified after verification
            const verificationUrl = url.replace(
                /callbackURL=[^&]*/,
                `callbackURL=${encodeURIComponent("/?status=email_verified")}`
            );
            // Send email verification using proper template
            try {
                const verificationHTML = await renderComponentToHTML(EmailVerificationMail, {
                    userName: user.name,
                    verificationUrl,
                    expiryHours: 24
                });

                const { success, error } = await sendMail(
                    user.email,
                    "Verify Your Email Address - Ventry",
                    verificationHTML
                );
                
                if (!success) {
                    console.error("Failed to send verification email:", error);
                    throw new Error(`Failed to send verification email: ${error}`);
                }
            } catch (err) {
                console.error("Error sending verification email:", err);
                throw err; // Rethrow to let better-auth handle retries if needed
            }
        }
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql",
        transaction: true
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        password: {
            hash: hashPassword,
            verify: verifyPassword
        },
        revokeSessionsOnPasswordReset: true,
        async onPasswordReset(data) {
            console.log("Password reset requested for:", data.user.email);

        },
        async sendResetPassword({ user, url}) {
            // Send password reset email
            try {
                const { success, error } = await sendMail(
                    user.email,
                    "Reset Your Password",
                    `<p>Hi ${user.name || 'there'},</p><p>You requested to reset your password. Click the link below to continue:</p><p><a href="${url}">Reset Password</a></p><p>If you didn't request this, you can safely ignore this email.</p>`
                );
                
                if (!success) {
                    console.error("Failed to send password reset email:", error);
                }
            } catch (err) {
                console.error("Error sending password reset email:", err);
            }
        },
    },
    socialProviders: {
        google: {
            enabled: true,
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            mapProfileToUser(profile) {
                return {
                    id: profile.sub,
                    name: clampDisplayName(profile.name),
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: profile.email_verified
                }
            },
            disableSignUp: false // Allow new users to sign up via Google
        },
        github: {
            enabled: true,
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            mapProfileToUser(profile) {
                return {
                    id: profile.id.toString(),
                    name: clampDisplayName(profile.name || profile.login),
                    email: profile.email,
                    image: profile.avatar_url,
                    emailVerified: true // GitHub emails are verified
                }
            },
            disableSignUp: false // Allow new users to sign up via GitHub
        }
    },
    events: {
        signUp: {
            after: async (context: unknown) => {
                // Send welcome email after successful registration
                const { user } = context as { user: { email: string; name: string } };
                
                if (user?.email && user?.name) {
                    try {
                        console.log("🎉 Sending welcome email to new user:", user.email);
                        
                        const welcomeHTML = await renderComponentToHTML(WelcomeMail, {
                            userName: user.name,
                            loginUrl: `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'https://local.dev:3443'}/login`
                        });

                        const { success, error } = await sendMail(
                            user.email,
                            "Welcome to Ventry!",
                            welcomeHTML
                        );

                        if (success) {
                            console.log("✅ Welcome email sent successfully to:", user.email);
                        } else {
                            console.error("❌ Failed to send welcome email:", error);
                        }
                    } catch (err) {
                        console.error("💥 Error sending welcome email:", err);
                    }
                }
            }
        }
    }
});

export const { POST, GET } = toNextJsHandler(auth);
