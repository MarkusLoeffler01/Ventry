import { prisma } from "@/lib/prisma/prisma";
import { calculatePlatformFeeAmount } from "@/lib/stripe";

// Ticket-count threshold below which an event pays no platform fee at all —
// lets small/early events run fee-free. 0 (default) disables the threshold,
// so the fee applies from the first ticket once PLATFORM_FEE_PERCENT is set.
export function getPlatformFeeFreeTicketThreshold(): number {
    return Number(process.env.PLATFORM_FEE_FREE_TICKET_THRESHOLD) || 0;
}

export async function countCompletedTickets(eventId: number): Promise<number> {
    return prisma.payment.count({
        where: { paymentStatus: "COMPLETED", registration: { eventId } },
    });
}

// Decides whether the *next* ticket for this event should carry a platform
// fee, based on how many completed tickets already exist for it — the first
// `threshold` tickets are free, everything after is fee'd.
export async function shouldApplyPlatformFeeForEvent(eventId: number): Promise<boolean> {
    const threshold = getPlatformFeeFreeTicketThreshold();
    if (threshold <= 0) return true;
    const completedCount = await countCompletedTickets(eventId);
    return completedCount >= threshold;
}

// Estimates total platform fees across a set of completed payments. This is
// a per-event switch, not a per-ticket exemption: an event under the
// threshold owes nothing at all; an event at/over it owes the fee on ALL of
// its tickets, not just the ones past the threshold. (The live charge in
// create-intent/route.ts can only ever decide this for the *next* payment —
// past Stripe transfers can't be retroactively fee'd — so it necessarily
// stays "free until the threshold, fee'd from then on" for real money. This
// estimate instead answers "given where each event ended up, what would its
// total platform fee be under the current settings".)
export function estimatePlatformFees(
    payments: { amount: number; eventId: number }[],
): number {
    const threshold = getPlatformFeeFreeTicketThreshold();
    const amountsByEvent = new Map<number, number[]>();

    for (const payment of payments) {
        const amounts = amountsByEvent.get(payment.eventId);
        if (amounts) amounts.push(payment.amount);
        else amountsByEvent.set(payment.eventId, [payment.amount]);
    }

    let total = 0;
    for (const amounts of amountsByEvent.values()) {
        if (amounts.length < threshold) continue;
        for (const amount of amounts) {
            total += calculatePlatformFeeAmount(Math.round(amount * 100)) / 100;
        }
    }

    return total;
}
