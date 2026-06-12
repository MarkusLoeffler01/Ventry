import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { getCheckInEligibility, resolveCheckInProducts, resolveTicketTier } from "@/lib/tickets/check-in";
import { rethrowIfExpectedPrerenderInterruption } from "@/lib/next/prerender";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await checkAdminAuth(req.headers);
    if (!authResult.authorized) {
      return forbiddenResponse(authResult.error);
    }

    const eventId = Number((await params).id);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        scanOnce: true,
        updatedAt: true,
        products: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        registrations: {
          select: {
            id: true,
            ticketId: true,
            status: true,
            preferences: true,
            expiresAt: true,
            checkedInAt: true,
            checkInCount: true,
            user: {
              select: {
                name: true,
                legalName: true,
              },
            },
            registrationItems: {
              select: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
            payments: {
              select: {
                paymentStatus: true,
              },
            },
          },
          orderBy: { ticketId: "asc" },
        },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const registrations = event.registrations.map((registration) => {
      const eligibility = getCheckInEligibility({
        status: registration.status,
        expiresAt: registration.expiresAt,
        checkedInAt: registration.checkedInAt,
        payments: registration.payments,
        scanOnce: event.scanOnce,
      });
      const resolvedProducts = resolveCheckInProducts(registration.registrationItems, registration.preferences, event.products);
      const ticketProduct = resolveTicketTier(registration.registrationItems, registration.preferences, event.products);
      const displayName = registration.user.name || registration.user.legalName || "Unnamed attendee";
      const legalName = registration.user.legalName || null;

      return {
        id: registration.id,
        ticketId: registration.ticketId,
        attendeeName: displayName,
        displayName,
        legalName,
        status: registration.status,
        checkedInAt: registration.checkedInAt?.toISOString() || null,
        checkInCount: registration.checkInCount,
        ticketTier: ticketProduct?.name || null,
        bookedItems: resolvedProducts.map(product => ({
          id: product.id,
          name: product.name,
          type: product.type,
        })),
        eligible: eligibility.eligible,
        eligibilityReason: eligibility.reason,
      };
    });

    return NextResponse.json({
      event: {
        id: event.id,
        name: event.name,
        scanOnce: event.scanOnce,
        snapshotUpdatedAt: new Date().toISOString(),
        eventUpdatedAt: event.updatedAt.toISOString(),
      },
      registrations,
    });
  } catch (error) {
    rethrowIfExpectedPrerenderInterruption(error);
    console.error("Check-in snapshot error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
