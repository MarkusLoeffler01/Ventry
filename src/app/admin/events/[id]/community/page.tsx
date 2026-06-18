import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Box } from "@mui/material";
import { checkEventAdminAuth } from "@/lib/auth/event-admin";
import { prisma } from "@/lib/prisma/prisma";
import PageLoadingState from "@/components/common/PageLoadingState";
import CommunityModerationPanel from "@/components/admin/community/CommunityModerationPanel";

export default function AdminEventCommunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <AdminEventCommunityPageContent params={params} />
    </Suspense>
  );
}

async function AdminEventCommunityPageContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const eventId = Number((await params).id);
  if (Number.isNaN(eventId)) notFound();

  const auth = await checkEventAdminAuth(eventId);
  if (!auth.authorized) {
    redirect(`/login?callbackUrl=/admin/events/${eventId}/community`);
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, communityEnabled: true, communityModerated: true },
  });

  if (!event) notFound();

  if (!event.communityEnabled) {
    redirect(`/admin/events/${eventId}`);
  }

  return (
    <Box sx={{ py: 4 }}>
      <CommunityModerationPanel
        eventId={event.id}
        communityModerated={event.communityModerated}
      />
    </Box>
  );
}
