import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { profilePictureSchema, profilePicturePATCH } from "@/types/user/profilePicture";

// GET: Retrieve a user's profile picture
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { profilePicture: true }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({ profilePicture: user.profilePicture }, { status: 200 });
    } catch (error) {
        console.error("Error retrieving profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST: Create a new profile picture (for new users)
export async function POST(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
        }

        let body: profilePicturePATCH;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid json" }, { status: 400 });
        }

        const parsed = profilePictureSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(parsed.error.format(), { status: 400 });
        }

        const { userId, imageUrl } = parsed.data;

        if (!userId || !imageUrl) {
            return NextResponse.json({ error: "Missing userId or imageUrl" }, { status: 400 });
        }

        // Check if user exists
        const existingUser = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!existingUser) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profilePicture: imageUrl },
        });

        return NextResponse.json({ message: "Profile picture created successfully", user: updatedUser }, { status: 201 });
    } catch (error) {
        console.error("Error creating profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// PATCH: Update an existing profile picture
export async function PATCH(req: NextRequest) {
    try {
        if (!req.headers.get("content-type")?.includes("application/json")) {
            return NextResponse.json({ error: "Invalid content type" }, { status: 400 });
        }

        let body: profilePicturePATCH;
        try {
            body = await req.json();
        } catch {
            return NextResponse.json({ error: "Invalid json" }, { status: 400 });
        }

        const parsed = profilePictureSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(parsed.error.format(), { status: 400 });
        }

        const { userId, imageUrl } = parsed.data;

        if (userId === null || userId === undefined || imageUrl === null || imageUrl === undefined) {
            return NextResponse.json({ error: "Missing userId or imageUrl" }, { status: 400 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profilePicture: imageUrl },
        });

        return NextResponse.json({ message: "Profile Image updated successfully", user: updatedUser }, { status: 200 });
    } catch (error) {
        console.error("Error updating profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// DELETE: Remove a profile picture
export async function DELETE(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const userId = url.searchParams.get("userId");

        if (!userId) {
            return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { profilePicture: null },
        });

        return NextResponse.json({ message: "Profile picture removed successfully", user: updatedUser }, { status: 200 });
    } catch (error) {
        console.error("Error deleting profile picture:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}