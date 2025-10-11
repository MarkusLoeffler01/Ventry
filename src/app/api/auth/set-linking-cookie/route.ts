import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { cookies } from "next/headers";

/**
 * Set the allow_oauth_linking cookie after password verification
 * This cookie authorizes the OAuth callback interceptor to allow account linking
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { userId, provider, expiresIn = 5 * 60 * 1000 } = await req.json();

        // Verify the userId matches the session
        if (userId !== session.user.id) {
            return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
        }

        if (!provider) {
            return NextResponse.json({ error: "Provider required" }, { status: 400 });
        }

        // Create the linking authorization cookie
        const cookieData = {
            userId: session.user.id,
            provider,
            timestamp: Date.now()
        };

        const cookieStore = await cookies();
        
        // Set the cookie with appropriate security settings
        cookieStore.set('allow_oauth_linking', JSON.stringify(cookieData), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: Math.floor(expiresIn / 1000), // Convert to seconds
            path: '/'
        });

        return NextResponse.json({ 
            success: true,
            message: "Linking authorized" 
        });

    } catch (error) {
        console.error("Set linking cookie error:", error);
        return NextResponse.json({ error: "Failed to authorize linking" }, { status: 500 });
    }
}
