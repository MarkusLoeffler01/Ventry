import { Prisma } from "@/generated/prisma";
import { prisma } from "@/lib/prisma/prisma";
import { clearProductStock } from "@/lib/redis";

const ACTIVE_REGISTRATION_STATUSES = ["PENDING", "APPROVED", "CONFIRMED"] as const;

export async function countActiveRegistrations(
    tx: Prisma.TransactionClient,
    eventId: number
) {
    return tx.registration.count({
        where: {
            eventId,
            status: {
                in: [...ACTIVE_REGISTRATION_STATUSES]
            }
        }
    });
}

export async function releaseExpiredPendingRegistrations(eventId: number) {
    const now = new Date();

    const releasedProductIds = await prisma.$transaction(async (tx) => {
        const expiredRegistrations = await tx.registration.findMany({
            where: {
                eventId,
                status: {
                    in: ["PENDING", "APPROVED"]
                },
                expiresAt: {
                    lt: now
                },
                payments: {
                    none: {
                        paymentStatus: "COMPLETED"
                    }
                }
            },
            include: {
                registrationItems: {
                    select: {
                        productId: true,
                        product: {
                            select: {
                                capacity: true
                            }
                        }
                    }
                }
            }
        });

        if (expiredRegistrations.length === 0) {
            return [] as string[];
        }

        const releasedIds = new Set<string>();

        for (const registration of expiredRegistrations) {
            const releaseCounts = new Map<string, { count: number; hasCapacityLimit: boolean }>();

            for (const item of registration.registrationItems) {
                const current = releaseCounts.get(item.productId);
                releaseCounts.set(item.productId, {
                    count: (current?.count || 0) + 1,
                    hasCapacityLimit: item.product.capacity !== null
                });
            }

            for (const [productId, release] of releaseCounts.entries()) {
                const updated = await tx.product.updateMany({
                    where: {
                        id: productId,
                        soldCount: {
                            gte: release.count
                        }
                    },
                    data: {
                        soldCount: {
                            decrement: release.count
                        }
                    }
                });

                if (updated.count > 0 && release.hasCapacityLimit) {
                    releasedIds.add(productId);
                }
            }

            await tx.payment.updateMany({
                where: {
                    registrationId: registration.id,
                    paymentStatus: "PENDING"
                },
                data: {
                    paymentStatus: "FAILED"
                }
            });

            await tx.registrationItem.deleteMany({
                where: {
                    registrationId: registration.id
                }
            });

            await tx.waitlistEntry.deleteMany({
                where: {
                    registrationId: registration.id
                }
            });

            await tx.registration.update({
                where: {
                    id: registration.id
                },
                data: {
                    status: "CANCELLED",
                    expiresAt: null
                }
            });
        }

        return Array.from(releasedIds);
    });

    if (releasedProductIds.length > 0) {
        await Promise.allSettled(releasedProductIds.map((productId) => clearProductStock(productId)));
    }

    return releasedProductIds.length;
}
