import CommunityLegacyRedirect from "./CommunityLegacyRedirect";

export default async function EventCommunityLegacyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <CommunityLegacyRedirect eventId={id} />;
}
