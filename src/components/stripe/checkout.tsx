export default async function IndexPage({ canceled }: { canceled?: boolean }) {

  if (canceled) {
    console.log(
      'Order canceled -- continue to shop around and checkout when you’re ready.'
    )
  }
  return (
    <form action="/api/checkout_sessions" method="POST">
      <section>
        <button type="submit">
          Checkout
        </button>
      </section>
    </form>
  )
}
