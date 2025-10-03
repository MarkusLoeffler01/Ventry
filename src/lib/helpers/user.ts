import { auth } from "@/app/api/auth/auth";


export async function getUserIdFromRequest(): Promise<string | null> {

    const session = await auth();

    return session?.user?.id || null;
}