import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma/prisma";
import { stripe, calculatePlatformFeeAmount } from "@/lib/stripe";
import { shouldApplyPlatformFeeForEvent } from "@/lib/billing/platformFee";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await req.json();

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 });
    }

    // Fetch payment from DB
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        registration: {
          include: {
            event: {
              include: {
                owner: {
                  select: { stripeConnectId: true }
                }
              }
            }
          }
        }
      }
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Verify ownership
    if (payment.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const eventOwnerStripeId = payment.registration.event.owner?.stripeConnectId;
    const amountInCents = Math.round(payment.amount * 100); // Stripe expects cents
    const applicationFeeAmount =
        eventOwnerStripeId && (await shouldApplyPlatformFeeForEvent(payment.registration.eventId))
            ? calculatePlatformFeeAmount(amountInCents)
            : 0;

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: payment.currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        paymentId: payment.id,
        registrationId: payment.registrationId,
        eventId: payment.registration.eventId.toString(),
        userId: session.user.id,
      },
      ...(eventOwnerStripeId && {
        transfer_data: {
          destination: eventOwnerStripeId,
        },
        on_behalf_of: eventOwnerStripeId,
        ...(applicationFeeAmount > 0 && { application_fee_amount: applicationFeeAmount }),
      }),
    });

    return NextResponse.json({ 
      clientSecret: paymentIntent.client_secret 
    });

  } catch (error) {
    console.error("Error creating payment intent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
