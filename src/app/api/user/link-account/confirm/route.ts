import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/auth';
import { prisma } from '@/lib/prisma/prisma';

/**
 * POST /api/user/link-account/confirm
 * Confirm and execute account linking after password verification
 * 
 * Body: {
 *   pendingLinkId: string,
 *   password: string,
 *   disableEmailLogin?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pendingLinkId, password, disableEmailLogin } = body as {
      pendingLinkId: string;
      password?: string;
      disableEmailLogin?: boolean;
    };

    // Validate input
    if (!pendingLinkId) {
      return NextResponse.json(
        { error: 'Missing pendingLinkId' },
        { status: 400 }
      );
    }

    // Get the pending link request
    const pendingLink = await prisma.pendingAccountLink.findUnique({
      where: { id: pendingLinkId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            password: true
          }
        }
      }
    });

    if (!pendingLink) {
      return NextResponse.json(
        { error: 'Pending link request not found' },
        { status: 404 }
      );
    }

    // Security Check 1: Verify this pending link belongs to the current user
    if (pendingLink.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Security Check 2: Verify the pending link hasn't expired
    if (pendingLink.expiresAt < new Date()) {
      // Clean up expired link
      await prisma.pendingAccountLink.delete({
        where: { id: pendingLinkId }
      });
      return NextResponse.json(
        { error: 'Pending link has expired' },
        { status: 410 }
      );
    }

    // Security Check 3: Verify authentication
    // Option A: User provides password (if they have one)
    // Option B: User is authenticated with a verified OAuth provider
    let isAuthenticated = false;

    // First, check if user has existing OAuth providers
    const existingOAuthAccounts = await prisma.account.findMany({
      where: {
        userId: session.user.id,
        provider: { in: ['github', 'google'] }
      }
    });

    const hasOAuthProviders = existingOAuthAccounts.length > 0;

    if (pendingLink.user.password && password) {
      // Option A: User has password and provided it - verify it
      const { comparePassword } = await import('@/lib/bcrypt');
      const isPasswordValid = await comparePassword(password, pendingLink.user.password);

      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
      
      isAuthenticated = true;
    } else if (hasOAuthProviders) {
      // Option B: User has OAuth providers linked - allow linking without password
      isAuthenticated = true;
    } else if (!pendingLink.user.password && !hasOAuthProviders) {
      // Edge case: User has no password and no OAuth providers
      return NextResponse.json(
        { error: 'Cannot verify identity - no password or OAuth providers' },
        { status: 400 }
      );
    } else {
      // User has password but didn't provide it, and has no OAuth providers
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      );
    }

    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }

    // Security Check 4: Verify the OAuth email matches the user's email
    if (pendingLink.providerEmail !== pendingLink.user.email) {
      return NextResponse.json(
        { error: 'Email mismatch - OAuth email does not match your account' },
        { status: 403 }
      );
    }

    // Security Check 5: Ensure account isn't already linked
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: pendingLink.provider
      }
    });

    if (existingAccount) {
      // Clean up the pending link
      await prisma.pendingAccountLink.delete({
        where: { id: pendingLinkId }
      });
      return NextResponse.json(
        { error: 'This provider is already linked to your account' },
        { status: 400 }
      );
    }

    // All security checks passed - Execute the account linking
    await prisma.$transaction(async (tx) => {
      // 1. Create the account link
      await tx.account.create({
        data: {
          userId: session.user.id,
          type: 'oauth',
          provider: pendingLink.provider,
          providerAccountId: pendingLink.providerAccountId,
          access_token: pendingLink.accessToken,
          refresh_token: pendingLink.refreshToken,
          id_token: pendingLink.idToken,
          expires_at: pendingLink.tokenExpiresAt,
          token_type: pendingLink.tokenType,
          scope: pendingLink.scope,
        }
      });

      // 2. If user chose to disable email login, remove password
      if (disableEmailLogin === true) {
        await tx.user.update({
          where: { id: session.user.id },
          data: { password: null }
        });
      }

      // 3. Delete the pending link request
      await tx.pendingAccountLink.delete({
        where: { id: pendingLinkId }
      });
    });

    // Log the successful link for security audit
    console.log(`✅ Account linked: User ${session.user.email} linked ${pendingLink.provider}`);

    // Future (Option B): Send confirmation email
    // if (process.env.EMAIL_ENABLED) {
    //   await sendAccountLinkedEmail(session.user.email, pendingLink.provider);
    // }

    return NextResponse.json(
      {
        success: true,
        message: `Successfully linked ${pendingLink.provider} account`,
        provider: pendingLink.provider,
        emailLoginDisabled: disableEmailLogin === true
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error confirming account link:', error);
    return NextResponse.json(
      { error: 'Failed to link account' },
      { status: 500 }
    );
  }
}
