import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export type PendingLink = {
    id: string;
    createdAt: Date;
    provider: string;
    providerEmail: string;
    emailVerified: boolean;
    expiresAt: Date;
};


/**
 * GET /api/user/link-account/pending
 * Get pending account link requests for the current user
 */
export async function GET(_request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all pending link requests for this user
    const pendingLinks = await prisma.pendingAccountLink.findMany({
      where: {
        userId: session.user.id,
        expiresAt: {
          gt: new Date() // Only non-expired requests
        }
      },
      select: {
        id: true,
        provider: true,
        providerEmail: true,
        emailVerified: true,
        createdAt: true,
        expiresAt: true
      }
    }) satisfies PendingLink[];

    return NextResponse.json(
      { pendingLinks },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching pending account links:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pending links' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/user/link-account/pending?id=xxx
 * Cancel a pending account link request
 */
export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const pendingLinkId = searchParams.get('id');

    if (!pendingLinkId) {
      return NextResponse.json(
        { error: 'Missing pending link ID' },
        { status: 400 }
      );
    }

    // Verify this pending link belongs to the user
    const pendingLink = await prisma.pendingAccountLink.findUnique({
      where: { id: pendingLinkId }
    });

    if (!pendingLink) {
      return NextResponse.json(
        { error: 'Pending link not found' },
        { status: 404 }
      );
    }

    if (pendingLink.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Delete the pending link
    await prisma.pendingAccountLink.delete({
      where: { id: pendingLinkId }
    });

    return NextResponse.json(
      { success: true, message: 'Pending link cancelled' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cancelling pending account link:', error);
    return NextResponse.json(
      { error: 'Failed to cancel pending link' },
      { status: 500 }
    );
  }
}
