import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma/prisma';
import { comparePassword } from '@/lib/bcrypt';
import { cookies } from 'next/headers';

/**
 * Verify password and enable account linking
 * 
 * This endpoint:
 * 1. Verifies the user's password
 * 2. Sets a temporary cookie to allow the next OAuth attempt to succeed
 * 3. Returns success so the client can initiate OAuth flow
 */
export async function POST(request: NextRequest) {
    try {
        const { email, password, provider } = await request.json();

        if (!email || !password || !provider) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Find user by email with their credential account
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                accounts: {
                    where: {
                        // better-auth uses 'credential' for email/password
                        providerId: 'credential'
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Get the credential account (contains the password)
        const credentialAccount = user.accounts.find(acc => acc.providerId === 'credential');
        
        if (!credentialAccount || !credentialAccount.password) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Verify password
        const isValidPassword = await comparePassword(password, credentialAccount.password);

        if (!isValidPassword) {
            return NextResponse.json(
                { error: 'Invalid credentials' },
                { status: 401 }
            );
        }

        // Password is correct! Set a temporary cookie to allow linking
        const cookieStore = await cookies();
        cookieStore.set('allow_oauth_linking', JSON.stringify({ userId: user.id, provider }), {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            maxAge: 300, // 5 minutes
            path: '/',
        });

        return NextResponse.json({
            success: true,
            message: 'Password verified. You can now complete the OAuth linking.',
        });
    } catch (error) {
        console.error('Error in verify-and-link:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
