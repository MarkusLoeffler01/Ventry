import { auth } from "@/app/api/auth/auth";
import { headers } from "next/headers";
import { rethrowIfExpectedPrerenderInterruption } from "@/lib/next/prerender";

export async function getUserIdFromRequest(requestHeaders?: Headers): Promise<string | null> {
    try {
        const session = await auth.api.getSession({
            headers: requestHeaders ?? await headers()
        });

        return session?.user?.id || null;
    } catch (error) {
        rethrowIfExpectedPrerenderInterruption(error);
        console.error("Error getting user session:", error);
        return null;
    }
}
