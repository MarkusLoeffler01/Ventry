import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import {
  CommunityError,
  assertCanWriteInCommunity,
  assertCommunityEnabled,
  loadCommunityActor,
  loadCommunityEvent,
} from "@/lib/community/server";
import { getSession } from "@/lib/auth/session";
import { getSignedUrl, uploadCommunityImage } from "@/lib/supabase";

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function toErrorResponse(error: unknown) {
  if (error instanceof CommunityError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error("Error uploading community image:", error);
  return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const eventId = Number(formData.get("eventId"));
    const file = formData.get("file") as File | null;

    if (Number.isNaN(eventId)) {
      return NextResponse.json({ error: "Invalid event id" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Only image uploads are supported" }, { status: 415 });
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image must be 6MB or smaller" }, { status: 413 });
    }

    const actor = await loadCommunityActor(session.user.id);
    if (!actor) {
      return NextResponse.json({ error: "User not found" }, { status: 403 });
    }

    const event = await loadCommunityEvent(eventId);
    assertCommunityEnabled(event);
    await assertCanWriteInCommunity(actor, event);

    const bytes = Buffer.from(await file.arrayBuffer());
    const processedBuffer = await sharp(bytes)
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .toFormat("jpeg", { quality: 82 })
      .toBuffer();

    const fileName = `community-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
    const uploadResult = await uploadCommunityImage(processedBuffer, event.id, actor.id, fileName);
    const signedUrlData = await getSignedUrl(uploadResult.path, 365 * 24 * 60 * 60);

    return NextResponse.json(
      {
        url: signedUrlData.signedUrl,
        path: uploadResult.path,
      },
      { status: 200 },
    );
  } catch (error) {
    return toErrorResponse(error);
  }
}
