import { type NextRequest, NextResponse } from "next/server";
import { USER_CONFIG } from "@/lib/config";
import { getUserIdFromRequest } from "@/lib/helpers/user";
import { uploadProfilePicture, getSignedUrl } from "@/lib/supabase";
import { add, remove, setPrimary } from "@/lib/user/profilePicture";
import { prisma } from "@/lib/prisma";

// GET: Retrieve a user's profile pictures
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { 
                profilePictures: {
                    orderBy: [
                        { order: 'asc' },      // User-defined order first
                        { isPrimary: 'desc' }, // Primary first for ties
                        { createdAt: 'desc' }  // Then newest first
                    ]
                } 
            }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Validate and refresh expired signed URLs
        const now = new Date();
        const validatedPictures = await Promise.all(
            user.profilePictures.map(async (picture) => {
                if (!picture.signedUrl || !picture.cachedUntil || picture.cachedUntil <= now) {
                    try {
                        const { signedUrl, expiresIn } = await getSignedUrl(picture.storagePath, 24 * 60 * 60);
                        
                        await prisma.profilePicture.update({
                            where: { id: picture.id },
                            data: {
                                signedUrl,
                                cachedUntil: new Date(Date.now() + expiresIn * 1000)
                            }
                        });
                        
                        return {
                            ...picture,
                            signedUrl,
                            cachedUntil: new Date(Date.now() + expiresIn * 1000)
                        };
                    } catch (error) {
                        console.error(`Failed to refresh signed URL for picture ${picture.id}:`, error);
                        return picture;
                    }
                }
                
                return picture;
            })
        );

        return NextResponse.json({ profilePictures: validatedPictures }, { status: 200 });
    } catch (error) {
        console.error("Error retrieving profile pictures:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Upload a new profile picture
export async function POST(req: NextRequest) {
    try {
        const userId = await getUserIdFromRequest();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const isPrimary = formData.get("isPrimary") === "true";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const bytes = Buffer.from(await file.arrayBuffer());

        if (bytes.length > USER_CONFIG.MAX_PROFILE_PIC_SIZE_MB * 1024 * 1024) {
            return NextResponse.json({ 
                error: `File size exceeds ${USER_CONFIG.MAX_PROFILE_PIC_SIZE_MB}MB limit` 
            }, { status: 400 });
        }

        // Upload to Supabase
        const uploadResult = await uploadProfilePicture(file, userId);
        
        // Generate signed URL with 24h expiry
        const signedUrlData = await getSignedUrl(uploadResult.path, 24 * 60 * 60); // 24 hours
        
        // Add to database using our service
        await add({
            userId,
            path: uploadResult.path,
            signedUrl: signedUrlData.signedUrl,
            expiresIn: signedUrlData.expiresIn
        });

        // Get the created profile picture
        const profilePicture = await prisma.profilePicture.findFirst({
            where: {
                userID: userId,
                storagePath: uploadResult.path
            },
            orderBy: { createdAt: 'desc' }
        });

        // If this should be primary, set it as primary
        if (isPrimary && profilePicture) {
            await setPrimary({
                userId,
                id: profilePicture.id,
                path: uploadResult.path
            });
        }

        return NextResponse.json({ 
            message: "Profile picture uploaded successfully", 
            profilePicture,
            url: signedUrlData.signedUrl
        }, { status: 200 });
    } catch (error) {
        console.error("Error uploading profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}


// PATCH: Set a profile picture as primary
export async function PATCH(req: NextRequest) {
    try {
        const userId = await getUserIdFromRequest();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!req.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
        }

        const body = await req.json();
        const { profilePictureId } = body;

        if (!profilePictureId) {
            return NextResponse.json({ error: "Missing profilePictureId" }, { status: 400 });
        }

        // Verify the profile picture belongs to the user
        const profilePicture = await prisma.profilePicture.findUnique({
            where: { id: profilePictureId }
        });

        if (!profilePicture || profilePicture.userID !== userId) {
            return NextResponse.json({ error: "Profile picture not found" }, { status: 404 });
        }

        // Set as primary using service function
        await setPrimary({
            userId,
            id: profilePictureId,
            path: profilePicture.storagePath || ""
        });

        return NextResponse.json({ message: "Profile picture set as primary successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error setting primary profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Remove a profile picture
export async function DELETE(req: NextRequest) {
    try {
        const userId = await getUserIdFromRequest();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const url = new URL(req.url);
        const profilePictureId = url.searchParams.get("profilePictureId");

        if (!profilePictureId) {
            return NextResponse.json({ error: "Missing profilePictureId parameter" }, { status: 400 });
        }

        // Use service function to remove profile picture
        await remove({
            userId,
            id: profilePictureId
        });

        return NextResponse.json({ message: "Profile picture removed successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error deleting profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}