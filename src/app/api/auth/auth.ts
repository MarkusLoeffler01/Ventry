import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { CustomPrismaAdapter } from "./custom-adapter";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";

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
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || ""
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
                    emailVerified: true, // GitHub emails are verified
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
                token.userId = user.id;
                token.email = user.email;

                // Generate API token for credentials/passkey users
                if (account?.provider === "credentials" || account?.provider === "passkey") {
                    if (!token.apiToken) {
                        token.apiToken = jwtService.sign(
                            { userId: user.id, email: user.email },
                            user.id,
                            { expiresIn: "7d" }
                        );
                    }
                }
            }
            return token;
        },

        session: async ({ session, token }) => {
            if ("userId" in token && token.userId) session.user.id = token.userId as string;
            if ("apiToken" in token && token.apiToken) session.apiToken = token.apiToken as string;
            return session;
        }
    },
    experimental: {
        enableWebAuthn: true
    },
    pages: { signIn: "/login" }
} satisfies NextAuthConfig)