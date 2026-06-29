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
      permissions: true,
      status: true,
      expiresAt: true,
    },
  });

  if (!invitation || invitation.organizationId !== orgId) {
    return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
  }
  if (invitation.status !== AdminInvitationStatus.PENDING) {
    return NextResponse.json({ error: "Invitation is no longer pending" }, { status: 409 });
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.adminInvitation.update({
      where: { id: invitation.id },
      data: { status: AdminInvitationStatus.EXPIRED },
    });
    return NextResponse.json({ error: "Invitation has expired" }, { status: 410 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, isAdmin: true, adminProfile: { select: { id: true } } },
  });

  if (!user || user.email !== invitation.invitedEmail) {
    return NextResponse.json({ error: "This invitation was sent to a different email address" }, { status: 403 });
  }

  // Auto-create admin profile if user doesn't have one yet
  await prisma.$transaction(async tx => {
    let adminId = user.adminProfile?.id;

    if (!adminId) {
      await tx.user.update({ where: { id: session.user.id }, data: { isAdmin: true } });
      const admin = await tx.admin.create({ data: { userId: session.user.id } });
      adminId = admin.id;
    }

    // Check not already a member
    const existing = await tx.adminOrganizationMembership.findUnique({
      where: { adminId_organizationId: { adminId, organizationId: orgId } },
    });

    if (!existing) {
      await tx.adminOrganizationMembership.create({
        data: {
          adminId,
          organizationId: orgId,
          permissions: invitation.permissions,
        },
      });
    }

    await tx.adminInvitation.update({
      where: { id: invitation.id },
      data: {
        status: AdminInvitationStatus.ACCEPTED,
        invitedAdminId: adminId,
      },
    });
  });

  return NextResponse.json({ success: true });
}
