// app/api/video-status/[id]/route.ts
// Polls Luma for generation status. On completion, downloads video and saves to Vercel Blob.
// Client calls this every 5 seconds until status is "completed" or "failed".

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import LumaAI from "lumaai";
import { uploadVideoFromUrl, deleteBlobUrl } from "../../../lib/videoBlob";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const url = new URL(req.url);
  const tempBlobUrl = url.searchParams.get("tempBlobUrl") ?? undefined;

  const luma = new LumaAI({ authToken: process.env.LUMA_API_KEY! });
  const generation = await luma.generations.get(id);
  const state = generation.state;

  if (state === "queued" || state === "dreaming") {
    return NextResponse.json({ status: "processing", state });
  }

  if (state === "failed") {
    if (tempBlobUrl) await deleteBlobUrl(tempBlobUrl);
    return NextResponse.json({
      status: "failed",
      reason: generation.failure_reason ?? "Unknown error from Luma",
    });
  }

  if (state === "completed") {
    const lumaVideoUrl = generation.assets?.video;
    if (!lumaVideoUrl) {
      return NextResponse.json({ status: "failed", reason: "No video URL returned" });
    }

    // Download from Luma and persist to Vercel Blob (Luma URLs expire)
    const videoUrl = await uploadVideoFromUrl(lumaVideoUrl, id);

    // Clean up the temporary input image blob if one was used
    if (tempBlobUrl) await deleteBlobUrl(tempBlobUrl);

    return NextResponse.json({ status: "completed", videoUrl });
  }

  // Unexpected state
  return NextResponse.json({ status: "processing", state });
}
