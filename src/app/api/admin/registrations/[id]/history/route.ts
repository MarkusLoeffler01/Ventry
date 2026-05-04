import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const id = (await params).id;

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
