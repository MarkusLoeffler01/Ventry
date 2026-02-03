import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { stripe } from '../../../lib/stripe'

export async function POST() {
  try {
    const headersList = await headers()
    const origin = headersList.get('origin')

    // Create Checkout Sessions from body params.
    const session = await stripe.checkout.sessions.create({
line_items: [
        {
          // Provide the exact Price ID (for example, price_1234) of the product you want to sell
          price: 'price_1SwUDXGeUPx9JNNs5QdY5mcg',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
    });
    if(!session.url) throw new Error("No session URL returned from Stripe");
    return NextResponse.redirect(session.url, 303)
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err))
    return NextResponse.json(
      { error: error.message },
      { status: err instanceof Error && 'statusCode' in err ? err.statusCode as number : 500 }
    )
  }
}