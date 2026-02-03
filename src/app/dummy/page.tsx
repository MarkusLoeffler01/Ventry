import { AddPasskeyButton } from "@/components/auth/AddPasskey";
import StripeCheckout from "@/components/stripe/checkout";

export default function Page() {
    return (
        <div>
            <h1>Add Passkey</h1>
            <AddPasskeyButton />

            <h1>Stripe Checkout</h1>
            <StripeCheckout />
        </div>
    );
}
