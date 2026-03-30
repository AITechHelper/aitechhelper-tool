// app/api/video-status/[id]/route.ts
// Polls Runway for generation status. On completion, downloads video and saves to Vercel Blob.
// Client calls this every 5 seconds until status is "completed" or "failed".

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import RunwayML from "@runwayml/sdk";
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

  const runway = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET! });
  const task = await runway.tasks.retrieve(id);

  if (
    task.status === "PENDING" ||
    task.status === "RUNNING" ||
    task.status === "THROTTLED"
  ) {
    return NextResponse.json({ status: "processing", state: task.status });
  }

  if (task.status === "FAILED") {
    if (tempBlobUrl) await deleteBlobUrl(tempBlobUrl);
    return NextResponse.json({
      status: "failed",
      reason: task.failure ?? "Runway generation failed",
    });
  }

  if (task.status === "CANCELLED") {
    if (tempBlobUrl) await deleteBlobUrl(tempBlobUrl);
    return NextResponse.json({ status: "failed", reason: "Runway task was cancelled" });
  }

  if (task.status === "SUCCEEDED") {
    const runwayVideoUrl = task.output?.[0];
    if (!runwayVideoUrl) {
      return NextResponse.json({ status: "failed", reason: "No video URL returned" });
    }

    // Download from Runway and persist to Vercel Blob (Runway URLs expire in 24-48h)
    const videoUrl = await uploadVideoFromUrl(runwayVideoUrl, id);

    // Clean up the temporary input image blob if one was used
    if (tempBlobUrl) await deleteBlobUrl(tempBlobUrl);

    return NextResponse.json({ status: "completed", videoUrl });
  }

  // Unexpected state
  return NextResponse.json({ status: "processing", state: "unknown" });
}
