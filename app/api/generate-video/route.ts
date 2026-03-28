// app/api/generate-video/route.ts
// Starts a Luma Dream Machine video generation job.
// Returns { generationId, tempBlobUrl? } immediately — client polls /api/video-status/[id].

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import LumaAI from "lumaai";
import { getTokenStatus, useToken } from "../../lib/tokens";
import { uploadTempImage } from "../../lib/videoBlob";

export const runtime = "nodejs";

type AspectRatio = "1:1" | "9:16" | "16:9";

type Body = {
  prompt: string;
  aspectRatio?: AspectRatio;
  imageBase64?: string; // image-to-video: post page "Animate" flow
  brandContext?: {
    niche?: string;
    audience?: string;
    tone?: string;
    name?: string;
    website?: string;
  };
};

function buildVideoPrompt(prompt: string, brand?: Body["brandContext"]): string {
  const parts: string[] = [];

  if (brand?.niche) parts.push(`Industry: ${brand.niche}.`);
  if (brand?.audience) parts.push(`Target audience: ${brand.audience}.`);
  if (brand?.tone) parts.push(`Visual tone: ${brand.tone}.`);

  parts.push(prompt.trim());

  parts.push(
    "Short 5-second social media video. Clean, professional, cinematic. " +
    "Smooth camera motion. No text overlays. No logos. No people speaking to camera. " +
    "Suitable for Instagram Reels and Facebook."
  );

  return parts.join(" ");
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const { prompt, aspectRatio = "9:16", imageBase64, brandContext } = body;

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  // Video costs 2 tokens — check upfront
  const status = await getTokenStatus(userId);
  if (status.remaining < 2) {
    return NextResponse.json(
      { error: "Not enough tokens. Video generation costs 2 tokens." },
      { status: 403 }
    );
  }

  // Deduct 2 tokens
  await useToken(userId);
  await useToken(userId);

  const luma = new LumaAI({ authToken: process.env.LUMA_API_KEY! });
  const enrichedPrompt = buildVideoPrompt(prompt, brandContext);

  let tempBlobUrl: string | undefined;

  const params: Parameters<typeof luma.generations.video.create>[0] = {
    model: "ray-flash-2",
    prompt: enrichedPrompt,
    aspect_ratio: aspectRatio,
    duration: "5s",
  };

  // Image-to-video: upload the base64 image to Vercel Blob so Luma can fetch it
  if (imageBase64) {
    tempBlobUrl = await uploadTempImage(imageBase64);
    params.keyframes = {
      frame0: { type: "image", url: tempBlobUrl },
    };
  }

  const generation = await luma.generations.video.create(params);

  return NextResponse.json({
    generationId: generation.id,
    tempBlobUrl: tempBlobUrl ?? null,
  });
}
