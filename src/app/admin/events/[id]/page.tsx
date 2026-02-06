import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";
import { redirect, notFound } from "next/navigation";
import EditEventClient from "./EditEventClient";
import { type SerializedEvent, type SerializedStayPolicy, type SerializedProduct } from "@/types/event";

export const dynamic = "force-dynamic";

export default async function EditEventPage({
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
      products: true,
    },
  });

  if (!event) notFound();

  // Serialize dates for client component
  const serializedEvent: SerializedEvent = {
    ...event,
    startDate: event.startDate.toISOString(),
    endDate: event.endDate.toISOString(),
    stayPolicy: event.stayPolicy as unknown as SerializedStayPolicy,
    schedule: (event.schedule as unknown as SerializedEvent["schedule"]) || [],
    products: event.products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        type: p.type as SerializedProduct['type'],
        capacity: p.capacity,
        soldCount: p.soldCount
    }))
  };

  return <EditEventClient event={serializedEvent} />;
}
