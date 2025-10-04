import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { CustomPrismaAdapter } from "./custom-adapter";
import { loginSchema } from "@/types/schemas/auth";
import { prisma } from "@/lib/prisma";

import Passkey from "next-auth/providers/passkey";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import * as SECCONFIG from "@/lib/security/config";
import { getPrimary, validatePicture } from "@/lib/user/profilePicture";

// Import bcrypt verification only for the credentials provider (Node.js runtime)
async function verifyUserCredentials(email: string, password: string) {
  const { verifyUser } = await import("@/lib/auth/verify");
  return verifyUser(email, password);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
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
                    const dbUser = await prisma.user.findFirst({
                        where: { id: token.userId as string },
                        include: { profilePictures: true } // Why tf do we need this here???
                    });
                    if (dbUser?.profilePictures) {
                        const primaryPicture = await getPrimary(token.userId as string);
                        if(!primaryPicture) return token;

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
    pages: { signIn: "/login" },
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