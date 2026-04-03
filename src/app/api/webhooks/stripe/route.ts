import { type NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Webhook Error" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const paymentId = paymentIntent.metadata.paymentId;
        const registrationId = paymentIntent.metadata.registrationId;

        console.log(`Payment succeeded for paymentId: ${paymentId}`);

        if (paymentId) {
          // Update Payment and Registration
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
        break;
      }
      
      // Handle other events like payment_intent.payment_failed if needed
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
