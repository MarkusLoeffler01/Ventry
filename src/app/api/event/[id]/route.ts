import { prisma } from "@/lib/prisma/prisma";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const ParamsSchema = z.object({ id: z.string().min(1) });

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> } // <- so will es Next.js
) {
  try {
    const parsed = ParamsSchema.safeParse(context.params);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    const eventId = parseInt(parsed.data.id, 10);
    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Event ID must be a number" }, { status: 400 });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json(event);
  } catch (error) {
    console.error(error);
    return NextResponse.json({
        error: `Database error: ${handlePrismaError(error)}`
    })
  }
}
