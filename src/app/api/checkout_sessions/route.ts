import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

import { stripe } from '../../../lib/stripe'
import { prisma } from '@/lib/prisma/prisma'

export async function POST(req: Request) {
  try {
    const headersList = await headers()
    const origin = headersList.get('origin') || new URL(req.url).origin
    const formData = await req.formData()
    const productId = formData.get('productId')

    if (typeof productId !== 'string' || !productId.trim()) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 })
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: product.name,
              ...(product.description ? { description: product.description } : {}),
              metadata: {
                productId: product.id,
              },
            },
            unit_amount: Math.round(product.price * 100),
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dummy?canceled=true`,
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
