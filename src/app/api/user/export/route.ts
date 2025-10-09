import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/api/auth/auth";
import prisma from "@/lib/prisma/prisma";
import type { UserDataExport } from "@/types/user/profile";

// GET: Export user data (GDPR compliance)
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    // Users can only export their own data
    if (userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch comprehensive user data
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profilePictures: {
          orderBy: [
            { order: 'asc' },
            { isPrimary: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        registration: {
          include: {
            payments: true
          }
        },
        payments: true,
        eventsOwned: true,
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            type: true,
            // Don't include sensitive tokens
          }
        },
        sessions: {
          select: {
            expires: true,
            // Don't include session tokens
          }
        }
      }
    });

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prepare export data (remove sensitive information)
    const exportData: UserDataExport = {
      profile: {
        id: userData.id,
        name: userData.name || undefined,
        email: userData.email,
        profilePictures: userData.profilePictures || [],
        bio: userData.bio || undefined,
        dateOfBirth: userData.dateOfBirth?.toISOString() || undefined,
        pronouns: userData.pronouns || undefined,
        showAge: userData.showAge,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt,
      },
      registrations: userData.registration ? [userData.registration] : [],
      payments: userData.payments,
      events: userData.eventsOwned,
      exportedAt: new Date().toISOString(),
    };

    // Set appropriate headers for file download
    const headers = {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${userData.name || 'user'}-data-export-${new Date().toISOString().split('T')[0]}.json"`,
    };

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers,
    });

  } catch (error) {
    console.error("Error exporting user data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}