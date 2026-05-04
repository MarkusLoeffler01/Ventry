import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import type { RegistrationStatus } from "@/generated/prisma";
import { rethrowIfExpectedPrerenderInterruption } from "@/lib/next/prerender";

// GET /api/admin/registrations - List all registrations for admins
export async function GET(req: NextRequest) {
    try {
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        const url = new URL(req.url);
        const eventId = url.searchParams.get("eventId");
        const status = url.searchParams.get("status");

        const registrations = await prisma.registration.findMany({
            where: {
                ...(eventId && { eventId: Number(eventId) }),
                ...(status && { status: status as RegistrationStatus }),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        image: true
                    }
                },
                event: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                registrationItems: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                waitlistEntries: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                type: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'asc'
                    }
                },
                payments: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ registrations }, { status: 200 });
    } catch (error) {
        rethrowIfExpectedPrerenderInterruption(error);
        console.error("Error listing admin registrations:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
