// app/lib/videoBlob.ts
// Server-side Vercel Blob helpers for video generation pipeline.
// Used by: app/api/generate-video/route.ts, app/api/video-status/[id]/route.ts

import { put, del } from "@vercel/blob";

/**
 * Upload a base64 image to Vercel Blob as a temporary public URL.
 * Used so Luma can fetch the image for image-to-video generation.
 * Call deleteBlobUrl() to clean up after Luma has grabbed it.
 */
export async function uploadTempImage(base64DataUrl: string): Promise<string> {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Data, "base64");
  const filename = `temp-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
  const blob = await put(filename, buffer, {
    access: "public",
    contentType: "image/jpeg",
  });
  return blob.url;
}

/**
 * Download a video from a URL and upload it to Vercel Blob for permanent storage.
 * Used after Luma completes — converts the expiring Luma URL into a persistent public URL.
 */
export async function uploadVideoFromUrl(
  videoUrl: string,
  generationId: string
): Promise<string> {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error(`Failed to fetch Luma video: ${res.status}`);
  const buffer = await res.arrayBuffer();
  const blob = await put(`videos/${generationId}.mp4`, buffer, {
    access: "public",
    contentType: "video/mp4",
  });
  return blob.url;
}

/**
 * Delete a blob URL. Best-effort — errors are swallowed to avoid failing the main flow.
 */
export async function deleteBlobUrl(url: string): Promise<void> {
  try {
    await del(url);
  } catch {
    // best-effort cleanup — don't fail the request
  }
}
