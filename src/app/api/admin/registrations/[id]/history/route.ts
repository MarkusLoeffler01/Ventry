import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, adminEventFilter, forbiddenResponse } from "@/lib/auth/admin";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        if (!authResult.adminId) {
            return NextResponse.json({ error: "Admin profile incomplete" }, { status: 403 });
        }

        const id = (await params).id;

        // Verify admin owns the event this registration belongs to
        const reg = await prisma.registration.findUnique({
            where: { id },
            select: { eventId: true },
        });
        if (!reg) return NextResponse.json({ error: "Registration not found" }, { status: 404 });

        const eventFilter = await adminEventFilter(authResult.adminId);
        const accessible = await prisma.event.findFirst({
            where: { id: reg.eventId, ...eventFilter },
            select: { id: true },
        });
        if (!accessible) return forbiddenResponse("No access to this registration");

        const history = await prisma.registrationHistory.findMany({
            where: { registrationId: id },
            include: {
                changedBy: {
                    include: {
                        user: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ history }, { status: 200 });
    } catch (error) {
        console.error("Error fetching registration history:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
