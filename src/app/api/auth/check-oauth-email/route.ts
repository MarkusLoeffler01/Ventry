import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * Check if an OAuth provider email already has an account
 * Returns: { exists: boolean, email: string | null }
 */
export async function POST(request: NextRequest) {
    try {
        const { provider } = await request.json();

        if (!provider || (provider !== 'google' && provider !== 'github')) {
            return NextResponse.json(
                { error: 'Invalid provider' },
                { status: 400 }
            );
        }

        // We can't get the email from OAuth provider without completing OAuth
        // So this endpoint is for future use with email input
        // For now, return that we can't check
        
        return NextResponse.json({
            exists: false,
            email: null,
            message: 'Cannot pre-check OAuth email without completing OAuth flow'
        });
    } catch (error) {
        console.error('Error checking OAuth email:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
