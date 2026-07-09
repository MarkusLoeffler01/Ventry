import { adminEventFilter } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma/prisma";

export async function getBillingData(adminId: string, orgScope?: string) {
    const eventFilter = await adminEventFilter(adminId, orgScope);
    const paymentEventFilter = { registration: { event: eventFilter } };

    const [byStatus, recentPayments, revenueByEvent] = await Promise.all([
        prisma.payment.groupBy({
            by: ["paymentStatus"],
            where: paymentEventFilter,
            _sum: { amount: true },
            _count: { _all: true },
        }),
        prisma.payment.findMany({
            where: paymentEventFilter,
            orderBy: { createdAt: "desc" },
            take: 20,
            include: {
                user: { select: { name: true, email: true } },
                registration: { include: { event: { select: { name: true } } } },
            },
        }),
        prisma.payment.groupBy({
            by: ["registrationId"],
            where: { paymentStatus: "COMPLETED", ...paymentEventFilter },
            _sum: { amount: true },
        }),
    ]);

    const statusMap = Object.fromEntries(
        byStatus.map((s) => [s.paymentStatus, { sum: s._sum.amount ?? 0, count: s._count._all }])
    );

    const completed = statusMap.COMPLETED ?? { sum: 0, count: 0 };
    const pending = statusMap.PENDING ?? { sum: 0, count: 0 };
    const failed = statusMap.FAILED ?? { sum: 0, count: 0 };
    const refunded = statusMap.REFUNDED ?? { sum: 0, count: 0 };

    // Approximate Stripe fee: 1.5% + EUR 0.25 per completed transaction.
    const stripeFees = completed.count * 0.25 + completed.sum * 0.015;
    const netRevenue = completed.sum - stripeFees;

    return { completed, pending, failed, refunded, stripeFees, netRevenue, recentPayments, revenueByEvent };
}
