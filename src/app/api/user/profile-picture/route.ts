import { type NextRequest, NextResponse } from "next/server";
import { USER_CONFIG } from "@/lib/config";
import { getUserIdFromRequest } from "@/lib/helpers/user";
import { uploadProfilePicture, getSignedUrl } from "@/lib/supabase";
import { add, refreshSignedUrls, remove, setPrimary } from "@/lib/user/profilePicture";
import { prisma } from "@/lib/prisma/prisma";
import { buildJpegCompressionCandidate, isStorageSizeError } from "@/lib/images/compression";

const MAX_PROFILE_PICTURE_BYTES = USER_CONFIG.MAX_PROFILE_PIC_SIZE_MB * 1024 * 1024;
const MAX_PROFILE_PICTURE_STORAGE_BYTES = USER_CONFIG.MAX_PROFILE_PIC_STORAGE_SIZE_MB * 1024 * 1024;
const PROFILE_PICTURE_COMPRESSION_ATTEMPTS = [
    { width: 1600, quality: 78 },
    { width: 1400, quality: 70 },
    { width: 1200, quality: 62 },
    { width: 1000, quality: 54 },
    { width: 800, quality: 46 },
];

function profilePictureTooLargeResponse() {
    return NextResponse.json({
        error: `File size exceeds ${USER_CONFIG.MAX_PROFILE_PIC_SIZE_MB}MB limit`
    }, { status: 400 });
}

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

        const validatedPictures = await refreshSignedUrls(user.profilePictures);

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

        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return profilePictureTooLargeResponse();
        }

        const file = formData.get("file") as File | null;
        const isPrimary = formData.get("isPrimary") === "true";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (typeof file.arrayBuffer !== "function") {
            return NextResponse.json({ error: "Invalid file uploaded" }, { status: 400 });
        }

        if (typeof file.size === "number" && file.size > MAX_PROFILE_PICTURE_BYTES) {
            return profilePictureTooLargeResponse();
        }

        let bytes: Buffer;
        try {
            bytes = Buffer.from(await file.arrayBuffer());
        } catch {
            return profilePictureTooLargeResponse();
        }

        if (bytes.length > MAX_PROFILE_PICTURE_BYTES) {
            return profilePictureTooLargeResponse();
        }

        const fileName = `profile-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        let uploadResult: Awaited<ReturnType<typeof uploadProfilePicture>> | null = null;

        for (const attempt of PROFILE_PICTURE_COMPRESSION_ATTEMPTS) {
            const candidate = await buildJpegCompressionCandidate(bytes, attempt);

            if (candidate.buffer.length > MAX_PROFILE_PICTURE_STORAGE_BYTES) {
                continue;
            }

            try {
                uploadResult = await uploadProfilePicture(candidate.buffer, userId, fileName);
                break;
            } catch (error) {
                if (!isStorageSizeError(error)) {
                    throw error;
                }
            }
        }

        if (!uploadResult) {
            return NextResponse.json({
                error: `Could not optimize image below ${USER_CONFIG.MAX_PROFILE_PIC_STORAGE_SIZE_MB}MB`
            }, { status: 413 });
        }
        
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
