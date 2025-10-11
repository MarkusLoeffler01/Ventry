import { auth } from "@/app/api/auth/auth";
import { headers } from "next/headers";

/**
 * Get the current session in server components or API routes
 * This is a wrapper around better-auth's getSession API
 */
export async function getSession() {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });
        return session;
    } catch (error) {
        console.error("Error getting session:", error);
        return null;
    }
}

/**
 * Require authentication - throws if not authenticated
 * Useful for server components that require auth
 */
export async function requireAuth() {
    const session = await getSession();
    if (!session?.user) {
        throw new Error("Authentication required");
    }
    return session;
}
