import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { Prisma } from "@/generated/prisma";
import { findHotelByRoomProductId, normalizeStayPolicy, resolveStayFee } from "@/lib/events/accommodation";
import { countActiveRegistrations, releaseExpiredPendingRegistrations } from "@/lib/events/registration-capacity";

type UpdateMode = "full" | "extras";

type RegistrationPreferences = {
    productId?: string;
    productIds?: string[];
    accommodationId?: string;
    needsHotel?: boolean;
    earlyArrival?: boolean;
    lateDeparture?: boolean;
    customFieldsData?: Record<string, string | number | boolean>;
    showOnAttendees?: boolean;
};

function uniqueIds(ids: Array<string | undefined | null>) {
    return Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
}

function sameIdSet(left: string[], right: string[]) {
    if (left.length !== right.length) {
        return false;
    }

    const rightSet = new Set(right);
    return left.every((value) => rightSet.has(value));
}

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

        await releaseExpiredPendingRegistrations(eventId);

        const body = await req.json();
        const mode: UpdateMode = body.mode === "extras" ? "extras" : "full";
        const preferences = (body.preferences || {}) as RegistrationPreferences;
        const requestedProductIds = uniqueIds(body.productIds || (body.productId ? [body.productId] : []));

        if (requestedProductIds.length === 0) {
            return NextResponse.json({ error: "No products selected" }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            include: {
                products: {
                    orderBy: { createdAt: "asc" }
                }
            }
        });

        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        const validProducts = event.products.filter((product) => requestedProductIds.includes(product.id));
        if (validProducts.length !== requestedProductIds.length) {
            return NextResponse.json({ error: "One or more invalid products selected" }, { status: 400 });
        }

        const requestedTicketIds = validProducts.filter((product) => product.type === "TICKET").map((product) => product.id);
        if (requestedTicketIds.length !== 1) {
            return NextResponse.json({ error: "Exactly one ticket must be selected" }, { status: 400 });
        }

        const requestedAccommodationIds = validProducts
            .filter((product) => product.type === "ACCOMMODATION")
            .map((product) => product.id);

        if (requestedAccommodationIds.length > 1) {
            return NextResponse.json({ error: "Only one accommodation can be selected" }, { status: 400 });
        }

        const productById = new Map(event.products.map((product) => [product.id, product]));
        const serializedProducts = event.products.map((product) => ({
            id: product.id,
            name: product.name,
            price: product.price,
            description: product.description,
            type: product.type,
            capacity: product.capacity,
            soldCount: product.soldCount
        }));
        const stayPolicy = normalizeStayPolicy(
            event.stayPolicy,
            serializedProducts,
            event.name,
            event.startDate,
            event.endDate
        );

        const result = await prisma.$transaction(async (tx) => {
            const existingRegistration = await tx.registration.findUnique({
                where: {
                    userId_eventId: {
                        userId: session.user.id,
                        eventId
                    }
                },
                include: {
                    registrationItems: true,
                    waitlistEntries: true,
                    payments: {
                        orderBy: { createdAt: "desc" }
                    }
                }
            });

            if (!existingRegistration) {
                throw new Error("Registration not found");
            }

            const existingPreferences = (existingRegistration.preferences || {}) as RegistrationPreferences;
            const hasCompletedPayment = existingRegistration.payments.some((payment) => payment.paymentStatus === "COMPLETED");
            const pendingPayment = existingRegistration.payments.find((payment) => payment.paymentStatus === "PENDING") || null;
            const approvalPending = Boolean(event.requireApproval) && existingRegistration.status === "PENDING" && !hasCompletedPayment;

            const existingConfirmedIds = existingRegistration.registrationItems.map((item) => item.productId);
            const existingWaitlistedIds = existingRegistration.waitlistEntries.map((item) => item.productId);
            const existingSelectedIds = uniqueIds([...existingConfirmedIds, ...existingWaitlistedIds]);

            const existingCoreIds = existingSelectedIds.filter((id) => productById.get(id)?.type !== "ADDON");
            const requestedCoreIds = requestedProductIds.filter((id) => productById.get(id)?.type !== "ADDON");
            const removedIds = existingSelectedIds.filter((id) => !requestedProductIds.includes(id));
            const addedIds = requestedProductIds.filter((id) => !existingSelectedIds.includes(id));

            if (hasCompletedPayment) {
                if (mode !== "extras") {
                    return NextResponse.json({
                        error: "Paid registrations can only add extras here. Ticket and hotel changes require organizer support."
                    }, { status: 409 });
                }

                if (!sameIdSet(existingCoreIds, requestedCoreIds)) {
                    return NextResponse.json({
                        error: "Paid registrations cannot change ticket or hotel selections. Contact support for that change."
                    }, { status: 409 });
                }

                if (removedIds.length > 0) {
                    return NextResponse.json({
                        error: "Paid registrations can only add extras. Removing items requires organizer support."
                    }, { status: 409 });
                }

                if (addedIds.some((id) => productById.get(id)?.type !== "ADDON")) {
                    return NextResponse.json({
                        error: "Only additional add-ons can be added after payment."
                    }, { status: 409 });
                }

                if (
                    existingPreferences.needsHotel !== preferences.needsHotel ||
                    existingPreferences.accommodationId !== preferences.accommodationId ||
                    existingPreferences.earlyArrival !== preferences.earlyArrival ||
                    existingPreferences.lateDeparture !== preferences.lateDeparture
                ) {
                    return NextResponse.json({
                        error: "Stay changes after payment require organizer support."
                    }, { status: 409 });
                }
            }

            if (removedIds.length > 0) {
                const removedConfirmedIds = existingConfirmedIds.filter((id) => removedIds.includes(id));
                const removedWaitlistIds = existingWaitlistedIds.filter((id) => removedIds.includes(id));

                if (removedConfirmedIds.length > 0) {
                    await tx.registrationItem.deleteMany({
                        where: {
                            registrationId: existingRegistration.id,
                            productId: { in: removedConfirmedIds }
                        }
                    });

                    for (const removedId of removedConfirmedIds) {
                        await tx.product.updateMany({
                            where: {
                                id: removedId,
                                soldCount: { gt: 0 }
                            },
                            data: {
                                soldCount: { decrement: 1 }
                            }
                        });
                    }
                }

                if (removedWaitlistIds.length > 0) {
                    await tx.waitlistEntry.deleteMany({
                        where: {
                            registrationId: existingRegistration.id,
                            productId: { in: removedWaitlistIds }
                        }
                    });
                }
            }

            const addedConfirmedIds: string[] = [];
            const addedWaitlistIds: string[] = [];

            for (const addedId of addedIds) {
                const product = productById.get(addedId);
                if (!product) {
                    throw new Error("Invalid product selected");
                }

                if (product.capacity !== null) {
                    const updated = await tx.product.updateMany({
                        where: {
                            id: addedId,
                            soldCount: { lt: product.capacity }
                        },
                        data: {
                            soldCount: { increment: 1 }
                        }
                    });

                    if (updated.count > 0) {
                        await tx.registrationItem.create({
                            data: {
                                registrationId: existingRegistration.id,
                                productId: addedId,
                                priceAtBooking: product.price
                            }
                        });
                        addedConfirmedIds.push(addedId);
                    } else if (product.allowWaitlist) {
                        await tx.waitlistEntry.create({
                            data: {
                                registrationId: existingRegistration.id,
                                productId: addedId
                            }
                        });
                        addedWaitlistIds.push(addedId);
                    } else {
                        throw new Error(`Product "${product.name}" is sold out.`);
                    }
                } else {
                    await tx.registrationItem.create({
                        data: {
                            registrationId: existingRegistration.id,
                            productId: addedId,
                            priceAtBooking: product.price
                        }
                    });
                    await tx.product.update({
                        where: { id: addedId },
                        data: {
                            soldCount: { increment: 1 }
                        }
                    });
                    addedConfirmedIds.push(addedId);
                }
            }

            const finalConfirmedIds = uniqueIds([
                ...existingConfirmedIds.filter((id) => !removedIds.includes(id)),
                ...addedConfirmedIds
            ]);
            const finalWaitlistIds = uniqueIds([
                ...existingWaitlistedIds.filter((id) => !removedIds.includes(id)),
                ...addedWaitlistIds
            ]);

            const wasActiveBeforeUpdate =
                existingRegistration.status !== "CANCELLED" &&
                existingRegistration.status !== "WAITLISTED";
            const willBeActiveAfterUpdate = finalConfirmedIds.length > 0;

            if (event.maxRegistrations && willBeActiveAfterUpdate && !wasActiveBeforeUpdate) {
                const activeRegistrationCount = await countActiveRegistrations(tx, eventId);
                if (activeRegistrationCount >= event.maxRegistrations) {
                    throw new Error("Registration is full");
                }
            }

            const finalConfirmedProducts = finalConfirmedIds
                .map((id) => productById.get(id))
                .filter((product): product is NonNullable<typeof event.products[number]> => Boolean(product));

            const selectedAccommodationId =
                preferences.accommodationId ||
                finalConfirmedProducts.find((product) => product.type === "ACCOMMODATION")?.id;
            const selectedRoom = finalConfirmedProducts.find((product) => product.id === selectedAccommodationId);
            const selectedHotel = findHotelByRoomProductId(
                stayPolicy,
                selectedAccommodationId,
                serializedProducts,
                event.name,
                event.startDate,
                event.endDate
            );

            let stayFeeTotal = 0;
            if (!hasCompletedPayment && preferences.earlyArrival && selectedHotel?.stayPolicy.earlyArrival.enabled) {
                stayFeeTotal += resolveStayFee(selectedHotel.stayPolicy.earlyArrival, selectedRoom?.price || 0);
            }
            if (!hasCompletedPayment && preferences.lateDeparture && selectedHotel?.stayPolicy.lateDeparture.enabled) {
                stayFeeTotal += resolveStayFee(selectedHotel.stayPolicy.lateDeparture, selectedRoom?.price || 0);
            }

            const currentSelectionTotal = finalConfirmedProducts.reduce((sum, product) => sum + product.price, 0) + stayFeeTotal;
            const additionalCharge = addedConfirmedIds
                .map((id) => productById.get(id))
                .filter((product): product is NonNullable<typeof event.products[number]> => Boolean(product))
                .reduce((sum, product) => sum + product.price, 0);

            let paymentId: string | null = null;
            let nextExpiresAt: Date | null = existingRegistration.expiresAt;

            if (approvalPending) {
                if (pendingPayment) {
                    await tx.payment.delete({ where: { id: pendingPayment.id } });
                }
                nextExpiresAt = null;
            } else if (hasCompletedPayment) {
                if (additionalCharge > 0) {
                    if (pendingPayment) {
                        const updatedPayment = await tx.payment.update({
                            where: { id: pendingPayment.id },
                            data: {
                                amount: pendingPayment.amount + additionalCharge
                            }
                        });
                        paymentId = updatedPayment.id;
                    } else {
                        const newPayment = await tx.payment.create({
                            data: {
                                userId: session.user.id,
                                registrationId: existingRegistration.id,
                                amount: additionalCharge,
                                currency: "EUR",
                                paymentStatus: "PENDING",
                                paymentProvider: "STRIPE"
                            }
                        });
                        paymentId = newPayment.id;
                    }
                    nextExpiresAt = event.paymentDeadline;
                }
            } else if (currentSelectionTotal > 0) {
                if (pendingPayment) {
                    const updatedPayment = await tx.payment.update({
                        where: { id: pendingPayment.id },
                        data: {
                            amount: currentSelectionTotal
                        }
                    });
                    paymentId = updatedPayment.id;
                } else {
                    const newPayment = await tx.payment.create({
                        data: {
                            userId: session.user.id,
                            registrationId: existingRegistration.id,
                            amount: currentSelectionTotal,
                            currency: "EUR",
                            paymentStatus: "PENDING",
                            paymentProvider: "STRIPE"
                        }
                    });
                    paymentId = newPayment.id;
                }
                nextExpiresAt = event.paymentDeadline;
            } else {
                if (pendingPayment) {
                    await tx.payment.delete({
                        where: { id: pendingPayment.id }
                    });
                }
                nextExpiresAt = null;
            }

            const nextStatus =
                hasCompletedPayment
                    ? existingRegistration.status
                    : finalConfirmedIds.length === 0 && finalWaitlistIds.length > 0
                        ? "WAITLISTED"
                        : "PENDING";

            await tx.registration.update({
                where: { id: existingRegistration.id },
                data: {
                    status: nextStatus as "PENDING" | "APPROVED" | "CONFIRMED" | "CANCELLED" | "WAITLISTED",
                    expiresAt: nextExpiresAt,
                    preferences: {
                        ...preferences,
                        productId: requestedTicketIds[0],
                        productIds: requestedProductIds,
                        accommodationId: selectedAccommodationId || undefined
                    } as Prisma.InputJsonValue
                }
            });

            return NextResponse.json({
                message: "Registration updated",
                paymentId,
                awaitingApproval: approvalPending
            }, { status: 200 });
        }, {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable
        });

        return result;
    } catch (error) {
        console.error("Update error:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
            return NextResponse.json({
                error: "Registration is busy right now. Please try again."
            }, { status: 409 });
        }

        const message = error instanceof Error ? error.message : "Internal Server Error";

        if (message === "Registration not found") {
            return NextResponse.json({ error: message }, { status: 404 });
        }

        if (message.includes("sold out") || message === "Registration is full") {
            return NextResponse.json({ error: message }, { status: 409 });
        }

        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
