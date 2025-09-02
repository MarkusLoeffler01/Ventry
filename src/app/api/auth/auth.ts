import NextAuth from "next-auth";
import Passkey from "next-auth/providers/passkey";
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/types/schemas/auth";
import jwtService from "@/lib/helpers/jsonwebtoken";

// Import bcrypt verification only for the credentials provider (Node.js runtime)
async function verifyUserCredentials(email: string, password: string) {
  const { verifyUser } = await import("@/lib/auth/verify");
  return verifyUser(email, password);
}

export const { auth, handlers, signIn, signOut } = NextAuth({
    adapter: PrismaAdapter(prisma),
    session: { strategy: "jwt" },
    secret: process.env.AUTH_SECRET,
    providers: [
        Passkey,
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
        jwt: async ({ token, user }) => {
            if(user) {
                token.userId = user?.id ?? token.userId;

                // if not present (e.g. Passkey-Login), create here
                if (!token.apiToken && "userId" in token) {
                    token.apiToken = jwtService.sign(
                        { userId: token.userId, email: user?.email ?? "" },
                        token.userId as string,
                        { expiresIn: "7d" }
                    );
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