import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");

        // Safety: only allow users to see their own registrations unless they are admin
        if (userId !== session.user.id) {
            // Check if requester is admin
            const requester = await prisma.user.findUnique({
                where: { id: session.user.id },
                select: { isAdmin: true }
            });
            if (!requester?.isAdmin) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        const registrations = await prisma.registration.findMany({
            where: { userId: userId || session.user.id },
            include: {
                event: {
                    select: {
                        id: true,
                        name: true,
                        startDate: true,
                        location: {
                            select: { city: true }
                        }
                    }
                },
                payments: {
                    select: {
                        amount: true,
                        currency: true,
                        paymentStatus: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ registrations }, { status: 200 });
    } catch (error) {
        console.error("Error fetching user registrations:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
