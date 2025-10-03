import { NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth";
import { prisma } from "@/lib/prisma";

// Helper function to check admin authorization using NextAuth only
export async function checkAdminAuth(): Promise<{ 
  authorized: boolean; 
  user?: { id: string; email: string }; 
  error?: string 
}> {
  try {
    // Use NextAuth session for all authentication
    const session = await auth();
    
    if (!session?.user?.id) {
      return { authorized: false, error: "Not authenticated" };
    }

    // Check if user is admin in database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, isAdmin: true }
    });
    
    if (!user) {
      return { authorized: false, error: "User not found" };
    }

    if (!user.isAdmin) {
      return { authorized: false, error: "Admin access required" };
    }

    return { 
      authorized: true, 
      user: { id: user.id, email: user.email } 
    };
    
  } catch (error) {
    console.error("Admin auth check failed:", error);
    return { authorized: false, error: "Authentication check failed" };
  }
}

// Response helpers
export function unauthorizedResponse(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbiddenResponse(message = "Forbidden - Admin access required") {
  return NextResponse.json({ error: message }, { status: 403 });
}