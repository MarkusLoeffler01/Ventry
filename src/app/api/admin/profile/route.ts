import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { checkAdminAuth } from "@/lib/auth/admin";

export async function GET(req: NextRequest) {
  const auth = await checkAdminAuth(req.headers);
  if (!auth.authorized || !auth.adminId) {
    return NextResponse.json({ error: auth.error }, { status: 403 });
  }

  const admin = await prisma.admin.findUnique({
    where: { id: auth.adminId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      organizationsOwned: { select: { id: true, name: true, slug: true } },
      organizationMemberships: {
        include: {
          organization: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  if (!admin) return NextResponse.json({ error: "Admin profile not found" }, { status: 404 });

  return NextResponse.json({ admin });
}
