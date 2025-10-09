import { prisma } from "@/lib/prisma/prisma";
import * as supa from "../supabase";




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