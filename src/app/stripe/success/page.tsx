import { redirect } from 'next/navigation'

import { stripe } from '@lib/stripe'

export default async function Success({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams

  if (!session_id)
    throw new Error('Please provide a valid session_id (`cs_test_...`)')

  const {
    status,
    customer_details,
    invoice,
  } = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['line_items', 'payment_intent']
  })

  const customerEmail = customer_details?.email

  // invoice; // Removed unused expression

  if (status === 'open') {
    return redirect('/')
  }

  if (status === 'complete') {
    return (
      <section>
        <p>
          We appreciate your business! A confirmation email will be sent to{' '}
          {customerEmail}. If you have any questions, please email{' '}
        </p>
        <a href="mailto:ventry-support@m-loeffler.de">ventry-support@m-loeffler.de</a>.
        <br />
        <br />
        Your invoice: {invoice && invoice.toString()}
      </section>

    )
  }
}
