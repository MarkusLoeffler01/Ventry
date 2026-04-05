import { AddPasskeyButton } from "@/components/auth/AddPasskey";
import StripeCheckout from "@/components/stripe/checkout";
import { prisma } from "@/lib/prisma/prisma";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

export default function Page({
    searchParams,
}: {
    searchParams?: Promise<{ canceled?: string }>;
}) {
    return (
        <Suspense fallback={<PageLoadingState />}>
            <DummyPageContent searchParams={searchParams} />
        </Suspense>
    );
}

async function DummyPageContent({
    searchParams,
}: {
    searchParams?: Promise<{ canceled?: string }>;
}) {
    const params = await searchParams;
    const demoProduct = await prisma.product.findFirst({
        orderBy: { createdAt: "asc" },
        select: {
            id: true,
            name: true,
            price: true,
        },
    });

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
