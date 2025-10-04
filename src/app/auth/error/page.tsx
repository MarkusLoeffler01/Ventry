import { redirect } from "next/navigation";
import { auth } from "@/app/api/auth/auth";
import { prisma } from "@/lib/prisma";

interface ErrorPageProps {
  searchParams: Promise<{
    error?: string;
  }>;
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams;
  const error = params.error;

  // Check if this is an AccessDenied error (could be account linking)
  if (error === "AccessDenied" || error?.startsWith("PENDING_LINK:")) {
    // Check if there are any pending link requests
    // This works for both logged-in and logged-out users
    const session = await auth();
    
    if (session?.user?.id) {
      // User is logged in - check for pending links
      const pendingLinks = await prisma.pendingAccountLink.findMany({
        where: {
          userId: session.user.id,
          expiresAt: {
            gt: new Date()
          }
        },
        select: {
          provider: true
        }
      });
      
      if (pendingLinks.length > 0) {
        // Redirect to link-account page
        redirect(`/link-account`);
      }
    }
    
    // If error starts with PENDING_LINK but user is not logged in
    if (error?.startsWith("PENDING_LINK:")) {
      const parts = error.split(":");
      const provider = parts[1];
      const email = parts[2];
      
      // User not logged in - redirect to login with message
      redirect(`/login?error=PleaseLoginFirst&provider=${provider}&email=${decodeURIComponent(email)}`);
    }
    
    // Generic AccessDenied - could be account collision
    // Redirect to login with generic message
    redirect(`/login?error=AccessDenied&message=AccountExists`);
  }

  // Handle other auth errors
  redirect(`/login?error=${error || 'Unknown'}`);
}
