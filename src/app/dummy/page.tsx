import { AddPasskeyButton } from "@/components/auth/AddPasskey";
import StripeCheckout from "@/components/stripe/checkout";
import { prisma } from "@/lib/prisma/prisma";

export default async function Page({
    searchParams,
}: {
    searchParams?: Promise<{ canceled?: string }>;
}) {
    const [demoProduct, params] = await Promise.all([
        prisma.product.findFirst({
            orderBy: { createdAt: "asc" },
            select: {
                id: true,
                name: true,
                price: true,
            },
        }),
        searchParams,
    ]);

    return (
        <div>
            <h1>Add Passkey</h1>
            <AddPasskeyButton />

            <h1>Stripe Checkout</h1>
            <StripeCheckout
                canceled={params?.canceled === "true"}
                productId={demoProduct?.id}
                productName={demoProduct?.name}
                productPrice={demoProduct?.price}
            />
        </div>
    );
}
