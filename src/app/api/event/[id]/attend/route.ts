import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { type StayPolicy } from "@/types/schemas/event/base";
import { Prisma } from "@/generated/prisma";

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

        const body = await req.json();
        const { productId, preferences } = body;

        // 1. Verify event exists and is published
        const event = await prisma.event.findUnique({
            where: { id: eventId, status: 'PUBLISHED' },
            include: { 
                products: true,
                _count: {
                    select: { registrations: true }
                }
            }
        });

        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        // Check if registration is open
        if (event.registrationOpensAt && new Date() < new Date(event.registrationOpensAt)) {
            return NextResponse.json({ error: "Registration is not yet open" }, { status: 403 });
        }

        // Check registration limit
        if (event.maxRegistrations && event._count.registrations >= event.maxRegistrations) {
            return NextResponse.json({ error: "Registration is full" }, { status: 403 });
        }

        // 2. Verify product belongs to event
        const product = event.products.find(p => p.id === productId);
        if (!product) return NextResponse.json({ error: "Invalid badge selection" }, { status: 400 });

        // Calculate Total Amount
        let totalAmount = product.price;
        const stayPolicy = event.stayPolicy as unknown as StayPolicy;

        if (preferences?.earlyArrival && stayPolicy?.earlyArrival?.enabled && stayPolicy.earlyArrival.feePerNight) {
            totalAmount += Number(stayPolicy.earlyArrival.feePerNight);
        }
        if (preferences?.lateDeparture && stayPolicy?.lateDeparture?.enabled && stayPolicy.lateDeparture.feePerNight) {
            totalAmount += Number(stayPolicy.lateDeparture.feePerNight);
        }

        // Use fixed deadline from event record
        const expiresAt = event.paymentDeadline;

        // 3. Create registration and payment record in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check if already registered (prevent race conditions)
            const existing = await tx.registration.findUnique({
                where: {
                    userId_eventId: {
                        userId: session.user.id,
                        eventId
                    }
                }
            });

            if (existing) throw new Error("Already registered for this event");

            const reg = await tx.registration.create({
                data: {
                    userId: session.user.id,
                    eventId: eventId,
                    status: 'PENDING',
                    expiresAt,
                    preferences: {
                        ...preferences,
                        productId
                    } as Prisma.InputJsonValue
                }
            });

            const payment = await tx.payment.create({
                data: {
                    userId: session.user.id,
                    registrationId: reg.id,
                    amount: totalAmount,
                    currency: 'EUR',
                    paymentStatus: 'PENDING',
                    paymentProvider: 'STRIPE'
                }
            });

            return { reg, payment };
        });

        return NextResponse.json({ 
            message: "Registration successful", 
            registrationId: result.reg.id,
            paymentId: result.payment.id
        }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : "Internal Server Error" 
        }, { status: 500 });
    }
}
