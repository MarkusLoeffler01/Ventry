import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const eventId = Number((await params).id);
        if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        // Update registration status to CANCELLED
        await prisma.registration.update({
            where: {
                userId_eventId: {
                    userId: session.user.id,
                    eventId
                }
            },
            data: {
                status: 'CANCELLED'
            }
        });

        return NextResponse.json({ message: "Registration cancelled" }, { status: 200 });

    } catch (error) {
        console.error("Cancellation error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
