import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { toNextJsHandler } from "better-auth/next-js";
import { passkey } from "better-auth/plugins/passkey"
import { twoFactor } from "better-auth/plugins/two-factor"
import { multiSession } from "better-auth/plugins/multi-session"
import { hashPassword } from "@/lib/bcrypt";
import { verifyPassword } from "@/lib/auth/verify";

const cookiePrefix = "VENTRY";

export const auth = betterAuth({
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
            enabled: true, // Enable linking - security enforced by middleware checking allow_oauth_linking cookie
            trustedProviders: ["github", "google"]
        }
    },
    emailVerification: {
        sendOnSignUp: false, // TODO: Set to true
        sendOnSignIn: false,
        expiresIn: 24 * 60 * 60, // 24 hours (correct property name)
        linkUrl: `${process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL}/verify-email?token=`,
        fromEmail: process.env.SMTP_FROM || "<ventry@m-loeffler.de>",
        autoSignInAfterVerification: true,
        sendVerificationEmail: async ({ user, url }) => {
            //TODO: Implement email sending logic here
            if (process.env.NODE_ENV === 'development') {
                console.log(`Send verification email to ${user.email}: ${url}`);
            }
        }
    },
    database: prismaAdapter(prisma, {
        provider: "postgresql"
    }),
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        password: {
            hash: hashPassword,
            verify: verifyPassword
        },
        async sendResetPassword({ user: _user, url: _url}) {
            //TODO: Implement email sending logic here
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
    }
});

export const { POST, GET } = toNextJsHandler(auth);
