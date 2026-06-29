import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/prisma";

export async function GET(req: NextRequest) {
  const registrationId = new URL(req.url).searchParams.get("registrationId");

  if (!registrationId) {
    return NextResponse.json({ error: "Missing registrationId" }, { status: 400 });
  }

  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    select: { id: true, eventId: true },
  });

  if (!registration) {
    return NextResponse.json({ error: "Registration not found" }, { status: 404 });
  }

  await prisma.registration.update({
    where: { id: registrationId },
    data: { communityNotifications: false },
  });

  return NextResponse.redirect(
    new URL(`/events/${registration.eventId}`, req.url),
  );
}
