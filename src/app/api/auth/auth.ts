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
            console.log(`Send verification email to ${user.email}: ${url}`);
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

/**
export const { _auth, handlers, signIn, signOut } = NextAuth({
    adapter: CustomPrismaAdapter(), // Use custom adapter
    session: { 
        strategy: "jwt",
        maxAge: SECCONFIG.SECURITY_CONFIG.JWT_MAX_AGE,
        updateAge: SECCONFIG.SECURITY_CONFIG.JWT_UPDATE_AGE, // 24 hours - refresh session daily
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true, // Required for production deployments
    providers: [
        Passkey, // ✅ Works with custom adapter
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: false, // ✅ SECURITY: Prevent account takeover
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    emailVerified: profile.email_verified ? new Date() : null,
                }
            }
        }),
        Github({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
            // SECURITY: Disabled dangerous email account linking to prevent account takeover
            allowDangerousEmailAccountLinking: false,
            profile(profile) {
                            return {
                    id: profile.id.toString(),
                    name: profile.name || profile.login,
                    email: profile.email ?? "",
                    image: profile.avatar_url,
                    emailVerified: new Date(), // GitHub emails are verified
                }
            }
        }),
        Credentials({
            name: "Email + Password",
            credentials: {
                email: { label: "E-Mail", type: "text", placeholder: "your@email.com" },
                password: { label: "Password", type: "password" }
            },
            authorize: async (creds) => {
                const parsed = loginSchema.safeParse({
                    email: String(creds?.email ?? ""),
                    password: String(creds?.password ?? "")
                });

                if(!parsed.success) return null;

                const user = await verifyUserCredentials(parsed.data.email, parsed.data.password);
                if(!user) return null;

                // No need for custom apiToken since we're using NextAuth JWT strategy
                return user
            }
        })
    ],
    callbacks: {
        async signIn({ user: _user, account, profile }) {
            // Handle OAuth account linking security
            if (account && profile && account.provider !== "credentials" && account.provider !== "passkey") {
                const oauthProvider = account.provider as "github" | "google";
                const oauthEmail = profile.email as string;
                
                // Security Check 1: Verify OAuth email is verified
                const isEmailVerified = 
                    (oauthProvider === "google" && profile.email_verified === true) ||
                    (oauthProvider === "github" && (profile.verified_email === true)); // GitHub emails are verified
                
                if (!isEmailVerified) {
                    console.error(`OAuth email not verified for ${oauthProvider}: ${oauthEmail}`);
                    return false; // Reject login
                }
                
                // Import prisma dynamically to ensure it's available in this context
                const { prisma } = await import("@/lib/prisma");
                
                // Check if user with this email already exists
                const existingUser = await prisma.user.findUnique({
                    where: { email: oauthEmail },
                    include: { 
                        accounts: {
                            where: { provider: oauthProvider }
                        }
                    }
                });
                
                // If user exists and doesn't have this provider linked yet
                if (existingUser && existingUser.accounts.length === 0) {
                    // User exists but this OAuth provider is not linked
                    // Create a pending link request instead of auto-linking
                    
                    // Check if there's already a pending link request
                    const existingPending = await prisma.pendingAccountLink.findUnique({
                        where: {
                            userId_provider: {
                                userId: existingUser.id,
                                provider: oauthProvider
                            }
                        }
                    });
                    
                    if (!existingPending) {
                        // Create pending link request (expires in 1 hour)
                        await prisma.pendingAccountLink.create({
                            data: {
                                userId: existingUser.id,
                                provider: oauthProvider,
                                providerAccountId: account.providerAccountId,
                                providerEmail: oauthEmail,
                                emailVerified: isEmailVerified,
                                accessToken: account.access_token,
                                refreshToken: account.refresh_token,
                                idToken: account.id_token,
                                tokenExpiresAt: account.expires_at,
                                tokenType: account.token_type,
                                scope: account.scope,
                                expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
                            }
                        });
                    }
                    
                    // Throw error to redirect to error page which will handle the redirect
                    throw new Error(`PENDING_LINK:${oauthProvider}:${encodeURIComponent(oauthEmail)}`);
                }
            }
            
            return true;
        },
        
        jwt: async ({ token, user, account }) => {
            if (user) {
                // Only log in development
                if (process.env.NODE_ENV === "development") {
                    console.log("JWT Callback - User object:", user);
                    console.log("JWT Callback - Account:", account);
                }
                
                token.userId = user.id;
                token.email = user.email;
                token.name = user.name || undefined;
                token.image = user.image || undefined;

                // NextAuth JWT handles all token management - no need for custom tokens
            }

            // If we have a userId but no image, fetch it from the database
            if (token.userId && !token.image) {
                try {
                    const primaryPicture = await getPrimary(token.userId as string);
                    if (primaryPicture) {
                        const validatedPicture = await validatePicture(token.userId as string, primaryPicture.id);
                        token.image = validatedPicture;
                    }
                } catch (error) {
                    console.error("JWT Callback - Error fetching user image:", error);
                }
            }

            return token;
        },

        session: async ({ session, token }) => {
            if ("userId" in token && token.userId) session.user.id = token.userId as string;
            if ("name" in token) session.user.name = token.name as string | null;
            if ("image" in token) session.user.image = token.image as string | null;
            // No custom apiToken needed - NextAuth handles all token management
            
            return session;
        }
    },
    experimental: {
        enableWebAuthn: true
    },
    pages: { 
        signIn: "/login",
        error: "/auth/error"
    },
    cookies: {
        sessionToken: {
            name: process.env.NODE_ENV === "production" ? 
                `__Secure-next-auth.session-token` : 
                `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                secure: process.env.NODE_ENV === "production", // Only HTTPS in production
                domain: process.env.NODE_ENV === "production" ? 
                    process.env.NEXTAUTH_URL?.replace(/https?:\/\//, '') : 
                    undefined
            }
        }
    },
    events: {
        async linkAccount({ user, account, profile: _profile }) {
            // Log account linking for security audit
            console.log(`🔗 Account linked: User ${user.email} linked ${account.provider}`);
            
            // Clean up any pending link requests for this provider
            if (user.id) {
                const { prisma } = await import("@/lib/prisma");
                await prisma.pendingAccountLink.deleteMany({
                    where: {
                        userId: user.id,
                        provider: account.provider
                    }
                }).catch((err: unknown) => {
                    console.error("Failed to clean up pending link:", err);
                });
            }
            
            // Future: Send confirmation email (Option B)
            // if (process.env.EMAIL_ENABLED) {
            //   await sendAccountLinkedEmail(user.email, account.provider);
            // }
        },
        
        async signIn({ user, account }) {
            // Log successful sign-ins for security monitoring
            console.log(`User ${user.email} signed in with ${account?.provider}`);
        },
        async signOut(message) {
            // Log sign-outs for security monitoring  
            if ('token' in message && message.token?.email) {
                console.log(`User ${message.token.email} signed out`);
            }
        }
    }
} satisfies NextAuthConfig)
 **/