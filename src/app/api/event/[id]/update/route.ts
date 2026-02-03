import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@/generated/prisma";
import { type StayPolicy } from "@/types/schemas/event/base";

export async function PATCH(
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

        // 1. Verify event exists
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: { products: true }
        });

        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        // 2. Verify product belongs to event
        const product = event.products.find(p => p.id === productId);
        if (!product) return NextResponse.json({ error: "Invalid badge selection" }, { status: 400 });

        // Calculate New Total Amount
        let totalAmount = product.price;
        const stayPolicy = event.stayPolicy as unknown as StayPolicy;

        if (preferences?.earlyArrival && stayPolicy?.earlyArrival?.enabled && stayPolicy.earlyArrival.feePerNight) {
            totalAmount += Number(stayPolicy.earlyArrival.feePerNight);
        }
        if (preferences?.lateDeparture && stayPolicy?.lateDeparture?.enabled && stayPolicy.lateDeparture.feePerNight) {
            totalAmount += Number(stayPolicy.lateDeparture.feePerNight);
        }

        // 3. Update registration and payment in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const updatedReg = await tx.registration.update({
                where: {
                    userId_eventId: {
                        userId: session.user.id,
                        eventId
                    }
                },
                data: {
                    preferences: {
                        ...preferences,
                        productId
                    } as Prisma.InputJsonValue
                },
                include: {
                    payments: {
                        where: { paymentStatus: 'PENDING' },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            const payment = updatedReg.payments[0];
            
            if (payment) {
                // Update existing pending payment
                await tx.payment.update({
                    where: { id: payment.id },
                    data: { amount: totalAmount }
                });
                return { registration: updatedReg, paymentId: payment.id };
            } else {
                // Create new payment if none pending (e.g. price changed after successful payment - simplified for now)
                // For this "basic" version, we assume we just update the pending one
                const newPayment = await tx.payment.create({
                    data: {
                        userId: session.user.id,
                        registrationId: updatedReg.id,
                        amount: totalAmount,
                        currency: 'EUR',
                        paymentStatus: 'PENDING',
                        paymentProvider: 'STRIPE'
                    }
                });
                return { registration: updatedReg, paymentId: newPayment.id };
            }
        });

        return NextResponse.json({ 
            message: "Registration updated", 
            paymentId: result.paymentId 
        }, { status: 200 });

    } catch (error) {
        console.error("Update error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
