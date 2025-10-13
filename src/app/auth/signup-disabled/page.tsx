import DisabledSignUp, { type DisabledSignUpProps } from "@/components/auth/errors/DisabledSignUp";

interface PageProps {
  searchParams: Promise<{
    reason?: string;
    message?: string;
    estimatedRestoration?: string;
    contactEmail?: string;
  }>;
}

export default async function SignupDisabledPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Validate reason parameter
  const validReasons: DisabledSignUpProps["reason"][] = [
    "maintenance",
    "capacity", 
    "invitation_only",
    "temporarily_disabled",
    "signup_disabled"
  ];
  
  const reason = validReasons.includes(params.reason as DisabledSignUpProps["reason"]) 
    ? (params.reason as DisabledSignUpProps["reason"]) 
    : "signup_disabled";
  
  return (
    <DisabledSignUp
      reason={reason}
      message={params.message}
      estimatedRestoration={params.estimatedRestoration}
      contactEmail={params.contactEmail}
    />
  );
}