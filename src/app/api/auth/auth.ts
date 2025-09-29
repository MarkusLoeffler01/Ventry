import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { CustomPrismaAdapter } from "./custom-adapter";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";
import { prisma } from "@/lib/prisma";

import Passkey from "next-auth/providers/passkey";
import Github from "next-auth/providers/github";
import Google from "next-auth/providers/google";

// Import bcrypt verification only for the credentials provider (Node.js runtime)
async function verifyUserCredentials(email: string, password: string) {
  const { verifyUser } = await import("@/lib/auth/verify");
  return verifyUser(email, password);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
    adapter: CustomPrismaAdapter(), // Use custom adapter
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    providers: [
        Passkey, // ✅ Works with custom adapter
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            allowDangerousEmailAccountLinking: true,
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
            // WARNING: Enabling dangerous email account linking can lead to account takeover vulnerabilities.
            // Make sure you understand the security implications and have reviewed this decision.
                        allowDangerousEmailAccountLinking: true,
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
                console.log("Authorizing user...");
                const parsed = loginSchema.safeParse({
                    email: String(creds?.email ?? ""),
                    password: String(creds?.password ?? "")
                });

                if(!parsed.success) return null;

                const user = await verifyUserCredentials(parsed.data.email, parsed.data.password);
                if(!user) return null;

                const apiToken = jwtService.sign(
                    { userId: user.id, email: user.email },
                    user.id,
                    { expiresIn: "7d" }
                );

                return {...user, apiToken}
            }
        })
    ],
    callbacks: {
        jwt: async ({ token, user, account }) => {
            if (user) {
                console.log("JWT Callback - User object:", user);
                console.log("JWT Callback - Account:", account);
                
                token.userId = user.id;
                token.email = user.email;
                token.name = user.name || undefined;
                token.image = user.image || undefined;

                console.log("JWT Callback - Token after update:", token);

                // Generate API token for credentials/passkey users
                if (account?.provider === "credentials" || account?.provider === "passkey") {
                    if (!token.apiToken) {
                        token.apiToken = jwtService.sign(
                            { userId: user.id, email: user.email },
                            user.id ?? "",
                            { expiresIn: "7d" }
                        );
                    }
                }
            }

            // If we have a userId but no image, fetch it from the database
            if (token.userId && !token.image) {
                console.log("JWT Callback - Fetching missing image for user:", token.userId);
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.userId as string }
                    });
                    if (dbUser?.profilePicture) {
                        token.image = dbUser.profilePicture;
                        console.log("JWT Callback - Added image from database:", token.image);
                    }
                } catch (error) {
                    console.error("JWT Callback - Error fetching user image:", error);
                }
            }

            return token;
        },

        session: async ({ session, token }) => {
            console.log("Session Callback - Token:", token);
            
            if ("userId" in token && token.userId) session.user.id = token.userId as string;
            if ("name" in token) session.user.name = token.name as string | null;
            if ("image" in token) session.user.image = token.image as string | null;
            if ("apiToken" in token && token.apiToken) session.apiToken = token.apiToken as string;
            
            console.log("Session Callback - Final session:", session);
            return session;
        }
    },
    experimental: {
        enableWebAuthn: true
    },
    pages: { signIn: "/login" }
} satisfies NextAuthConfig)