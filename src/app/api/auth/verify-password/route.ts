import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth/verify";

/**
 * Verify user's password for sensitive operations like account linking
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSession();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
        }

        const { password } = await req.json();

        if (!password) {
            return NextResponse.json({ error: "Password required" }, { status: 400 });
        }

        // Get user's credential account with password
        const account = await prisma.account.findFirst({
            where: {
                userId: session.user.id,
                providerId: 'credential'
            },
            select: {
                password: true
            }
        });

        if (!account?.password) {
            return NextResponse.json({ error: "No password set" }, { status: 400 });
        }

        // Verify password using the correct function signature
        const isValid = await verifyPassword({ 
            hash: account.password, 
            password 
        });

        if (!isValid) {
            return NextResponse.json({ error: "Invalid password" }, { status: 403 });
        }

        // Password is valid
        return NextResponse.json({ 
            success: true,
            userId: session.user.id 
        });

    } catch (error) {
        console.error("Password verification error:", error);
        return NextResponse.json({ error: "Verification failed" }, { status: 500 });
    }
}
