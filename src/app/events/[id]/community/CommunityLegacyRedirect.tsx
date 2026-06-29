"use client";

import { useEffect } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

interface CommunityLegacyRedirectProps {
  eventId: string;
}

export default function CommunityLegacyRedirect({ eventId }: CommunityLegacyRedirectProps) {
  useEffect(() => {
    const hash = window.location.hash;
    window.location.replace(`/events/${encodeURIComponent(eventId)}${hash}`);
  }, [eventId]);

  return <PageLoadingState />;
}
