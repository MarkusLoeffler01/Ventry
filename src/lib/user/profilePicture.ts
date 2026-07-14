import { prisma } from "@/lib/prisma/prisma";
import * as supa from "../supabase";
import { USER_CONFIG } from "@/lib/config";
import { buildJpegCompressionCandidate, isStorageSizeError } from "@/lib/images/compression";

const SIGNED_URL_REFRESH_SKEW_MS = 5 * 60 * 1000;
const MAX_IMPORT_BYTES = USER_CONFIG.MAX_PROFILE_PIC_SIZE_MB * 1024 * 1024;
const MAX_IMPORT_STORAGE_BYTES = USER_CONFIG.MAX_PROFILE_PIC_STORAGE_SIZE_MB * 1024 * 1024;
const IMPORT_COMPRESSION_ATTEMPTS = [
    { width: 1600, quality: 78 },
    { width: 1400, quality: 70 },
    { width: 1200, quality: 62 },
    { width: 1000, quality: 54 },
    { width: 800, quality: 46 },
];

type ProfilePicture = {
    userId: string;
    id: string;
    
    /**
     * The storage path of the profile picture in Supabase Storage
     * @example "users/{userId}/{fileName}"
     */
    path: string;
}

type AddProfilePictureParams = Omit<ProfilePicture, "id"> & {
    signedUrl: string;
    expiresIn: number; // in seconds
}

type RefreshableProfilePicture = {
    id: string;
    signedUrl: string | null;
    storagePath: string;
    cachedUntil: Date | string | null;
}

function getSignedUrlExpiry(signedUrl: string | null) {
    if (!signedUrl) return null;

    try {
        const token = new URL(signedUrl).searchParams.get("token");
        const payload = token?.split(".")[1];
        if (!payload) return null;

        const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
        const decoded = JSON.parse(Buffer.from(normalized, "base64").toString("utf8")) as { exp?: unknown };
        return typeof decoded.exp === "number" ? new Date(decoded.exp * 1000) : null;
    } catch {
        return null;
    }
}

function hasUsableSignedUrl(picture: RefreshableProfilePicture, now: Date) {
    if (!picture.signedUrl || !picture.cachedUntil || new Date(picture.cachedUntil) <= now) {
        return false;
    }

    const tokenExpiry = getSignedUrlExpiry(picture.signedUrl);
    return !tokenExpiry || tokenExpiry.getTime() > now.getTime() + SIGNED_URL_REFRESH_SKEW_MS;
}

export async function refreshSignedUrls<T extends RefreshableProfilePicture>(
    profilePictures: T[],
    expiresInSeconds: number = 24 * 60 * 60
): Promise<T[]> {
    const now = new Date();

    return Promise.all(
        profilePictures.map(async (picture) => {
            if (hasUsableSignedUrl(picture, now)) {
                return picture;
            }

            try {
                const { signedUrl, expiresIn } = await supa.getSignedUrl(
                    picture.storagePath,
                    expiresInSeconds
                );
                const cachedUntil = new Date(Date.now() + expiresIn * 1000);

                await prisma.profilePicture.update({
                    where: { id: picture.id },
                    data: {
                        signedUrl,
                        cachedUntil
                    }
                });

                return {
                    ...picture,
                    signedUrl,
                    cachedUntil
                };
            } catch (error) {
                console.error(`Failed to refresh signed URL for picture ${picture.id}:`, error);
                return picture;
            }
        })
    );
}

export async function add(props: AddProfilePictureParams) {

    const { userId, signedUrl, expiresIn, path } = props;

    await prisma.user.update({
        where: { id: userId },
        data: {
            profilePictures: {
                create: {
                    cachedUntil: new Date(Date.now() + expiresIn * 1000),
                    signedUrl: signedUrl,
                    storagePath: path
                }
            }
        }
    });
}

/**
 * Best-effort import of an OAuth provider's avatar as the user's first,
 * primary profile picture. `imageUrl` must come from our own DB (the
 * `user.image` value we set from Google/GitHub's profile at signup) - never
 * pass through a client-supplied URL here, or this becomes an SSRF vector.
 */
export async function importOAuthProfilePicture(userId: string, imageUrl: string) {
    const response = await fetch(imageUrl);
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) {
        throw new Error(`Unable to fetch OAuth avatar (status ${response.status})`);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > MAX_IMPORT_BYTES) {
        throw new Error("OAuth avatar exceeds size limit");
    }

    const fileName = `profile-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

    for (const attempt of IMPORT_COMPRESSION_ATTEMPTS) {
        const candidate = await buildJpegCompressionCandidate(bytes, attempt);
        if (candidate.buffer.length > MAX_IMPORT_STORAGE_BYTES) continue;

        try {
            const uploadResult = await supa.uploadProfilePicture(candidate.buffer, userId, fileName);
            const signedUrlData = await supa.getSignedUrl(uploadResult.path, 24 * 60 * 60);
            await add({
                userId,
                path: uploadResult.path,
                signedUrl: signedUrlData.signedUrl,
                expiresIn: signedUrlData.expiresIn,
            });

            const picture = await prisma.profilePicture.findFirst({
                where: { userID: userId, storagePath: uploadResult.path },
                orderBy: { createdAt: "desc" },
            });
            if (picture) {
                await setPrimary({ userId, id: picture.id, path: uploadResult.path });
            }
            return;
        } catch (error) {
            if (!isStorageSizeError(error)) throw error;
        }
    }

    throw new Error(`Could not compress OAuth avatar below ${USER_CONFIG.MAX_PROFILE_PIC_STORAGE_SIZE_MB}MB`);
}

type RemoveProfilePicture = Omit<ProfilePicture, "path">;

export async function remove(props: RemoveProfilePicture) {
    const { userId, id } = props;

    // First, get the specific profile picture by ID to find its storagePath
    const profilePicture = await prisma.profilePicture.findUnique({
        where: { id: id },
        select: {
            storagePath: true,
            userID: true
        }
    });

    if (!profilePicture) {
        throw new Error("Profile picture not found");
    }

    // Verify that this profile picture belongs to the user
    if (profilePicture.userID !== userId) {
        throw new Error("Profile picture does not belong to this user");
    }

    // Delete the profile picture from the database first
    await prisma.profilePicture.delete({
        where: { id: id }
    });

    // Check if this storagePath is still being used by ANY profile picture in the database
    if (profilePicture.storagePath) {
        const count = await prisma.profilePicture.count({
            where: {
                storagePath: profilePicture.storagePath
            }
        });

        // If count is 0, it means no other profile picture uses this storagePath
        // So we can safely delete it from Supabase storage
        if (count === 0) {
            await supa.deleteProfilePicture(profilePicture.storagePath);
        }
    }
}

export async function validatePicture(userId: string, id: string) {
    const profilePicture = await prisma.profilePicture.findFirst({
        where: {
            id: id,
            userID: userId
        }
    });

    if (!profilePicture) {
        throw new Error("Profile picture not found or does not belong to this user");
    }

    if(profilePicture.cachedUntil && profilePicture.cachedUntil > new Date()) {
        return profilePicture.signedUrl;
    }


    // If the cached URL has expired, generate a new signed URL from Supabase
    const { signedUrl, expiresIn } = await supa.getSignedUrl(profilePicture.storagePath);
    
    // Update the database with the new signed URL and new cachedUntil time
    await prisma.profilePicture.update({
        where: { id: profilePicture.id },
        data: {
            signedUrl: signedUrl,
            cachedUntil: new Date(Date.now() + expiresIn * 1000)
        }
    });
    
    return signedUrl;
}

export async function getPrimary(userId: string) {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            profilePictures: {
                where: {
                    isPrimary: true,
                }             
            }
        }
    });

    if (!user) {
        throw new Error("User not found");
    }
    
    if (user.profilePictures.length === 0) {
        return null; // No profile picture found
    }
    return user.profilePictures[0];
}

export async function setPrimary(props: ProfilePicture) {
    const { userId, id } = props;

    // Use a transaction to ensure atomic operations
    await prisma.$transaction(async (tx) => {
        // First, find and unset any existing primary profile picture for this user
        

        await tx.profilePicture.updateMany({
            where: { userID: userId, isPrimary: true },
            data: { isPrimary: false }
        });

        // Then set the specified profile picture as primary
        await tx.profilePicture.update({
            where: { id: id },
            data: { isPrimary: true }
        });
    });
}
