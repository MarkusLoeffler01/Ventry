import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import VerifyLinkingClient from "@/app/link-account/verify/VerifyLinkingClient";

interface VerifyLinkingPageProps {
  searchParams: Promise<{
    provider?: string;
    returnTo?: string;
  }>;
}

export default async function VerifyLinkingPage({ searchParams }: VerifyLinkingPageProps) {
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
