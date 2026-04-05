import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { normalizeStayPolicy } from "@/lib/events/accommodation";
import { redirect, notFound } from "next/navigation";
import EditEventClient from "./EditEventClient";
import type { SerializedEvent, SerializedProduct } from "@/types/event";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

export default function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <EditEventPageContent params={params} />
    </Suspense>
  );
}

async function EditEventPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const authResult = await checkAdminAuth();
  if (!authResult.authorized) {
    redirect("/login?callbackUrl=/admin/events");
  }

  const id = Number((await params).id);
  if (isNaN(id)) notFound();

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      location: true,
      products: {
        orderBy: { createdAt: "asc" }
      },
    },
  });

  if (!event) notFound();

  // Serialize dates for client component
  const serializedEvent: SerializedEvent = {
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    products: event.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        type: p.type as SerializedProduct['type'],
        capacity: p.capacity,
        soldCount: p.soldCount
    })),
    stayPolicy: normalizeStayPolicy(
      event.stayPolicy,
      event.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        type: p.type as SerializedProduct['type'],
        capacity: p.capacity,
        soldCount: p.soldCount
      })),
      event.location?.name || event.name,
      event.startDate,
      event.endDate
    ),
    schedule: (event.schedule as unknown as SerializedEvent["schedule"]) || [],
  };

  return <EditEventClient event={serializedEvent} />;
}
