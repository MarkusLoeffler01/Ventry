
import { prisma } from "@/lib/prisma";
import { handlePrismaError } from "@/lib/helpers/prismaErrorHandler";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const _Params = z.object({ id: z.string().min(1) });

export async function GET(_req: NextRequest, { params }: { params: z.infer<typeof _Params> }) {
    try {
        const { id } = params;
        if (!id) return NextResponse.json({ error: "Event ID is required" }, { status: 400 });

        const event = await prisma.event.findUnique({ where: { id: Number(id) } });
        if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });

        return NextResponse.json(event, { status: 200 });
    } catch (error) {
        return handlePrismaError(error);
    }
}
