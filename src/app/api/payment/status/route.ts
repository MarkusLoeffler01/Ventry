import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentIntentId = searchParams.get("payment_intent");

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing payment_intent ID" }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Security check: ensure this payment intent belongs to the current user
    if (paymentIntent.metadata.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Sync DB if Stripe says it succeeded but we haven't updated yet
    if (paymentIntent.status === 'succeeded') {
      const paymentId = paymentIntent.metadata.paymentId;
      const registrationId = paymentIntent.metadata.registrationId;

      if (paymentId && registrationId) {
        const currentPayment = await prisma.payment.findUnique({
          where: { id: paymentId },
          select: { paymentStatus: true }
        });

        if (currentPayment && currentPayment.paymentStatus === 'PENDING') {
          console.log(`Proactively syncing success for payment ${paymentId}`);
          await prisma.$transaction([
            prisma.payment.update({
              where: { id: paymentId },
              data: { paymentStatus: "COMPLETED" },
            }),
            prisma.registration.update({
              where: { id: registrationId },
              data: { status: "CONFIRMED" },
            }),
          ]);
        }
      }
    }

    return NextResponse.json({ paymentIntent });

  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
