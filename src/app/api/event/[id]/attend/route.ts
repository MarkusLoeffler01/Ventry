import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { type StayPolicy } from "@/types/schemas/event/base";
import { Prisma } from "@/generated/prisma";
import { decrementProductStock, getOrInitProductStock, incrementProductStock } from "@/lib/redis";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const eventId = Number((await params).id);
        if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                products: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        capacity: true,
                        soldCount: true,
                        price: true
                    }
                }
            }
        });

        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        const availability = event.products.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            price: p.price,
            capacity: p.capacity,
            sold: p.soldCount,
            remaining: p.capacity === null ? 'Unlimited' : Math.max(0, p.capacity - p.soldCount),
            isSoldOut: p.capacity !== null && p.soldCount >= p.capacity
        }));

        return NextResponse.json({ 
            eventId: event.id,
            eventName: event.name,
            availability 
        });

    } catch (error) {
        console.error("Availability check error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const reservedItems: string[] = []; // Track IDs we successfully reserved in Redis
    
    try {
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const eventId = Number((await params).id);
        if (isNaN(eventId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

        const body = await req.json();
        // Support both old format (single productId) and new format (productIds array)
        const productIds: string[] = body.productIds || (body.productId ? [body.productId] : []);
        const { preferences } = body;

        if (productIds.length === 0) {
             return NextResponse.json({ error: "No products selected" }, { status: 400 });
        }

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

        if (event.registrationOpensAt && new Date() < new Date(event.registrationOpensAt)) {
            return NextResponse.json({ error: "Registration is not yet open" }, { status: 403 });
        }

        if (event.maxRegistrations && event._count.registrations >= event.maxRegistrations) {
            return NextResponse.json({ error: "Registration is full" }, { status: 403 });
        }

        // 2. Validate Products & Check Redis Availability
        const validProducts = event.products.filter(p => productIds.includes(p.id));
        if (validProducts.length !== productIds.length) {
             return NextResponse.json({ error: "One or more invalid products selected" }, { status: 400 });
        }

        // Categorize results
        const confirmedProductIds: string[] = [];
        const waitlistProductIds: string[] = [];
        let totalAmount = 0;

        for (const product of validProducts) {
            if (product.capacity !== null) {
                await getOrInitProductStock(product.id, product.capacity, product.soldCount);
                const hasStock = await decrementProductStock(product.id);
                
                if (hasStock) {
                    reservedItems.push(product.id);
                    confirmedProductIds.push(product.id);
                    totalAmount += product.price;
                } else {
                    if (!product.allowWaitlist) {
                        throw new Error(`Product "${product.name}" is sold out.`);
                    }
                    waitlistProductIds.push(product.id);
                }
            } else {
                // Unlimited
                confirmedProductIds.push(product.id);
                totalAmount += product.price;
            }
        }

        const stayPolicy = event.stayPolicy as unknown as StayPolicy;
        if (preferences?.earlyArrival && stayPolicy?.earlyArrival?.enabled && stayPolicy.earlyArrival.feePerNight) {
            totalAmount += Number(stayPolicy.earlyArrival.feePerNight);
        }
        if (preferences?.lateDeparture && stayPolicy?.lateDeparture?.enabled && stayPolicy.lateDeparture.feePerNight) {
            totalAmount += Number(stayPolicy.lateDeparture.feePerNight);
        }

        const expiresAt = event.paymentDeadline;

        // 3. Database Transaction
        const result = await prisma.$transaction(async (tx) => {
            // Check existing registration
            const existing = await tx.registration.findUnique({
                where: { userId_eventId: { userId: session.user.id, eventId } }
            });

            if (existing) {
                 throw new Error("Already registered for this event");
            }

            const isFullyWaitlisted = confirmedProductIds.length === 0 && waitlistProductIds.length > 0;
            const status = isFullyWaitlisted ? 'WAITLISTED' : 'PENDING';

            const reg = await tx.registration.create({
                data: {
                    userId: session.user.id,
                    eventId: eventId,
                    status: status,
                    expiresAt,
                    preferences: {
                        ...preferences,
                        productIds
                    } as Prisma.InputJsonValue
                }
            });

            // Process Confirmed Items
            for (const pid of confirmedProductIds) {
                const p = validProducts.find(vp => vp.id === pid)!;
                
                // Increment DB Counter
                if (p.capacity !== null) {
                     const updated = await tx.product.updateMany({
                        where: { id: pid, soldCount: { lt: p.capacity } },
                        data: { soldCount: { increment: 1 } }
                    });
                    
                    if (updated.count === 0) {
                        throw new Error(`System Error: Capacity mismatch for product ${p.name}. Please try again.`);
                    }
                } else {
                    await tx.product.update({
                        where: { id: pid },
                        data: { soldCount: { increment: 1 } }
                    });
                }
            }

            // Process Waitlist Items
            for (const pid of waitlistProductIds) {
                 await tx.waitlistEntry.create({
                    data: {
                        registrationId: reg.id,
                        productId: pid
                    }
                });
            }

            let payment = null;
            if (totalAmount > 0 && !isFullyWaitlisted) { 
                 payment = await tx.payment.create({
                    data: {
                        userId: session.user.id,
                        registrationId: reg.id,
                        amount: totalAmount,
                        currency: 'EUR',
                        paymentStatus: 'PENDING',
                        paymentProvider: 'STRIPE'
                    }
                });
            }

            return { reg, payment, status };
        });

        return NextResponse.json({ 
            message: result.status === 'WAITLISTED' ? "Added to waitlist" : "Registration successful",
            registrationId: result.reg.id,
            paymentId: result.payment?.id,
            status: result.status,
            confirmedProducts: confirmedProductIds,
            waitlistedProducts: waitlistProductIds
        }, { status: 201 });

    } catch (error) {
        console.error("Registration error:", error);
        
        if (reservedItems.length > 0) {
            await Promise.all(reservedItems.map(id => incrementProductStock(id)));
        }

        const message = error instanceof Error ? error.message : "Internal Server Error";
        const status = message.includes("sold out") ? 403 : 500;

        return NextResponse.json({ error: message }, { status });
    }
}