type StripeCheckoutProps = {
  canceled?: boolean
  productId?: string
  productName?: string
  productPrice?: number
}

export default function IndexPage({
  canceled,
  productId,
  productName,
  productPrice,
}: StripeCheckoutProps) {
  const isDisabled = !productId

  return (
    <form action="/api/checkout_sessions" method="POST">
      <section>
        {productId ? <input type="hidden" name="productId" value={productId} /> : null}
        <button type="submit" disabled={isDisabled}>
          {productName ? `Checkout ${productName}` : 'Checkout'}
        </button>
        {typeof productPrice === 'number' ? <p>{productPrice.toFixed(2)} EUR</p> : null}
        {canceled ? <p>Order canceled. You can retry checkout at any time.</p> : null}
        {isDisabled ? <p>No product available for the checkout demo.</p> : null}
      </section>
    </form>
  )
}
