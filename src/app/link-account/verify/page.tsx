import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import VerifyLinkingClient from "@/app/link-account/verify/VerifyLinkingClient";
import { Suspense } from "react";
import PageLoadingState from "@/components/common/PageLoadingState";

interface VerifyLinkingPageProps {
  searchParams: Promise<{
    provider?: string;
    returnTo?: string;
  }>;
}

export default function VerifyLinkingPage({ searchParams }: VerifyLinkingPageProps) {
  return (
    <Suspense fallback={<PageLoadingState />}>
      <VerifyLinkingPageContent searchParams={searchParams} />
    </Suspense>
  );
}

async function VerifyLinkingPageContent({ searchParams }: VerifyLinkingPageProps) {
  const session = await getSession();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/login");
  }

  const provider = params.provider;
  const returnTo = params.returnTo || "/profile";

  if (!provider || (provider !== "google" && provider !== "github")) {
    redirect("/profile?error=invalid_provider");
  }

  return <VerifyLinkingClient provider={provider} returnTo={returnTo} userId={session.user.id} />;
}
