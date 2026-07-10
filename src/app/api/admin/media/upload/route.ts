import { type NextRequest, NextResponse } from "next/server";
import { checkAdminAuth, forbiddenResponse } from "@/lib/auth/admin";
import { uploadEventImage, getSignedUrl } from "@/lib/supabase";
import { MEDIA_CONFIG } from "@/lib/config";
import { buildJpegCompressionCandidate, isStorageSizeError } from "@/lib/images/compression";

const MAX_BANNER_BYTES = MEDIA_CONFIG.MAX_EVENT_BANNER_SIZE_MB * 1024 * 1024;
const MAX_BANNER_STORAGE_BYTES = MEDIA_CONFIG.MAX_EVENT_BANNER_STORAGE_SIZE_MB * 1024 * 1024;
const BANNER_COMPRESSION_ATTEMPTS = [
    { width: 1200, height: 630, fit: "cover" as const, quality: 78 },
    { width: 1200, height: 630, fit: "cover" as const, quality: 68 },
    { width: 1100, height: 578, fit: "cover" as const, quality: 58 },
    { width: 960, height: 504, fit: "cover" as const, quality: 50 },
    { width: 820, height: 431, fit: "cover" as const, quality: 42 },
];
const BADGE_PHOTO_COMPRESSION_ATTEMPTS = [
    { width: 900, height: 900, fit: "cover" as const, quality: 75 },
];

function bannerTooLargeResponse() {
    return NextResponse.json({
        error: `Banner image must be ${MEDIA_CONFIG.MAX_EVENT_BANNER_SIZE_MB}MB or smaller before optimization`
    }, { status: 413 });
}

export async function POST(req: NextRequest) {
    try {
        // 1. Check Admin Auth
        const authResult = await checkAdminAuth(req.headers);
        if (!authResult.authorized) {
            return forbiddenResponse(authResult.error);
        }

        // 2. Parse Form Data
        let formData: FormData;
        try {
            formData = await req.formData();
        } catch {
            return bannerTooLargeResponse();
        }

        const file = formData.get("file") as File | null;
        const mode = formData.get("mode") === "badge-photo" ? "badge-photo" : "banner";

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (typeof file.arrayBuffer !== "function") {
            return NextResponse.json({ error: "Invalid file uploaded" }, { status: 400 });
        }

        if (mode === "banner" && typeof file.size === "number" && file.size > MAX_BANNER_BYTES) {
            return bannerTooLargeResponse();
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        if (mode === "banner" && bytes.length > MAX_BANNER_BYTES) {
            return bannerTooLargeResponse();
        }

        const fileName = `${mode === "badge-photo" ? "badge-photo" : "event"}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const bucket = mode === "banner" ? "banners" : "profile";
        const attempts = mode === "banner" ? BANNER_COMPRESSION_ATTEMPTS : BADGE_PHOTO_COMPRESSION_ATTEMPTS;
        let uploadResult: Awaited<ReturnType<typeof uploadEventImage>> | null = null;

        for (const attempt of attempts) {
            const candidate = await buildJpegCompressionCandidate(bytes, attempt);

            if (mode === "banner" && candidate.buffer.length > MAX_BANNER_STORAGE_BYTES) {
                continue;
            }

            try {
                uploadResult = await uploadEventImage(candidate.buffer, fileName, bucket);
                break;
            } catch (error) {
                if (mode !== "banner" || !isStorageSizeError(error)) {
                    throw error;
                }
            }
        }

        if (!uploadResult) {
            return NextResponse.json({
                error: `Could not optimize banner below ${MEDIA_CONFIG.MAX_EVENT_BANNER_STORAGE_SIZE_MB}MB`
            }, { status: 413 });
        }

        const signedUrlData = await getSignedUrl(uploadResult.path, 365 * 24 * 60 * 60, bucket);

        return NextResponse.json({ 
            url: signedUrlData.signedUrl,
            path: uploadResult.path
        }, { status: 200 });

    } catch (error) {
        console.error("Error uploading event image:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
