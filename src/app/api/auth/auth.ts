import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { passkey } from "better-auth/plugins/passkey"
import { lastLoginMethod, twoFactor, multiSession } from "better-auth/plugins";
import { hashPassword } from "@/lib/bcrypt";
import { verifyPassword } from "@/lib/auth/verify";
import { sendMail } from "@/lib/mail";
import { renderComponentToHTML } from "@/lib/helpers/html";
import WelcomeMail from "@/components/emails/WelcomeMail";
import EmailVerificationMail from "@/components/emails/EmailVerificationMail";

const cookiePrefix = "VENTRY";

export const auth = betterAuth({
    rateLimit: {
        enabled: true,
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100, // limit each IP to 100 requests per windowMs
    },
    advanced: {
        // better-auth uses default cookie settings
        // Cookies are prefixed with __Secure- and automatically use:
        // - secure: true (required for https)
        // - sameSite: 'lax' (allows OAuth redirects)
        // - httpOnly: true (prevents XSS)
        cookiePrefix: process.env.NODE_ENV === "production" ? `__Secure-${cookiePrefix}` : cookiePrefix,
    },
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "https://local.dev:3443",
    trustedOrigins: ["https://local.dev:3443", "http://localhost:3000"],
    secret: process.env.BETTER_AUTH_SECRET || process.env.AUTH_SECRET,
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
    session: {

    },
    account: {
        accountLinking: {
            enabled: true, // Enable - but we control it via allow_oauth_linking cookie
            trustedProviders: ["github", "google"]
        }
    },
    emailVerification: {
        sendOnSignUp: false, // TODO: Set to true
        sendOnSignIn: false,
        expiresIn: 24 * 60 * 60, // 24 hours (correct property name)

        fromEmail: process.env.SMTP_FROM || "<ventry@m-loeffler.de>",
        autoSignInAfterVerification: true,

        sendVerificationEmail: async ({ user, url }) => {
            // Send email verification using proper template
            try {
                const verificationHTML = await renderComponentToHTML(EmailVerificationMail, {
                    userName: user.name,
                    verificationUrl: url,
                    expiryHours: 24
                });

                const { success, error } = await sendMail(
                    user.email,
                    "Verify Your Email Address - Ventry",
                    verificationHTML
                );
                
                if (!success) {
                    console.error("Failed to send verification email:", error);
                }
            } catch (err) {
                console.error("Error sending verification email:", err);
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
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: profile.email_verified
                }
            },
            disableSignUp: true // Allow new users to sign up via Google
        },
        github: {
            enabled: true,
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            mapProfileToUser(profile) {
                return {
                    id: profile.id.toString(),
                    name: profile.name || profile.login,
                    email: profile.email,
                    image: profile.avatar_url,
                    emailVerified: true // GitHub emails are verified
                }
            },
            disableSignUp: true // Allow new users to sign up via GitHub
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
