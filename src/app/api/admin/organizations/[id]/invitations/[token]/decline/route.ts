import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/prisma";
import { getSession } from "@/lib/auth/session";
import { headers } from "next/headers";
import { AdminInvitationStatus } from "@/generated/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; token: string }> },
) {
  const session = await getSession(await headers());
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: orgId, token } = await params;

  const invitation = await prisma.adminInvitation.findUnique({
    where: { token },
    select: {
      id: true,
      organizationId: true,
      invitedEmail: true,
      status: true,
    },
  });

  if (!invitation || invitation.organizationId !== orgId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.status !== AdminInvitationStatus.PENDING) {
    return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  });

  if (!user || user.email !== invitation.invitedEmail) {
    return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 403 });
  }

  await prisma.adminInvitation.update({
    where: { id: invitation.id },
    data: { status: AdminInvitationStatus.DECLINED },
  });

  return NextResponse.json({ success: true });
}
