import { auth } from "@/app/api/auth/auth";
import { headers } from "next/headers";

export async function getUserIdFromRequest(): Promise<string | null> {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        return session?.user?.id || null;
    } catch (error) {
        console.error("Error getting user session:", error);
        return null;
    }
}