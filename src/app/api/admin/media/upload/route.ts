import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { uploadEventImage, getSignedUrl } from "@/lib/supabase";

export async function POST(req: NextRequest) {
    try {
        // 1. Check Admin Auth
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        // 2. Parse Form Data
        const formData = await req.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        // 3. Process with Sharp
        const bytes = Buffer.from(await file.arrayBuffer());
        const processedBuffer = await sharp(bytes)
            .resize(1200, 630, { fit: 'cover' }) // Standard OpenGraph / Banner size
            .toFormat('jpeg', { quality: 75 })
            .toBuffer();

        // 4. Upload to Supabase
        const fileName = `event-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const uploadResult = await uploadEventImage(processedBuffer, fileName);

        // 5. Get Signed URL (valid for 1 year for banners, or just return path if public)
        // Usually, event banners might be public, but let's stick to signed for consistency
        const signedUrlData = await getSignedUrl(uploadResult.path, 365 * 24 * 60 * 60);

        return NextResponse.json({ 
            url: signedUrlData.signedUrl,
            path: uploadResult.path
        }, { status: 200 });

    } catch (error) {
        console.error("Error uploading event image:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
