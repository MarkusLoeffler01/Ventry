import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { auth } from '@/app/api/auth/auth';
import { prisma } from '@/lib/prisma/prisma';

export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth();
    
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { pictureIds } = body as { pictureIds: string[] };

    if (!pictureIds || !Array.isArray(pictureIds) || pictureIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: pictureIds array is required' },
        { status: 400 }
      );
    }

    // Verify all pictures belong to the user
    const pictures = await prisma.profilePicture.findMany({
      where: {
        id: { in: pictureIds },
        userID: session.user.id,
      },
    });

    if (pictures.length !== pictureIds.length) {
      return NextResponse.json(
        { error: 'Some pictures do not belong to you or do not exist' },
        { status: 403 }
      );
    }

    // Update each picture's order in a transaction
    await prisma.$transaction(
      pictureIds.map((pictureId, index) =>
        prisma.profilePicture.update({
          where: { id: pictureId },
          data: { order: index },
        })
      )
    );

    return NextResponse.json(
      { 
        success: true,
        message: 'Picture order updated successfully'
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error reordering profile pictures:', error);
    return NextResponse.json(
      { error: 'Failed to reorder pictures' },
      { status: 500 }
    );
  }
}
