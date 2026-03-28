// app/api/generate-video/route.ts
// Starts a Luma Dream Machine video generation job.
// Uses GPT-4o to build a cinematic, optimised prompt before sending to Luma.
// Returns { generationId, tempBlobUrl? } immediately — client polls /api/video-status/[id].

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import LumaAI from "lumaai";
import OpenAI from "openai";
import { getTokenStatus, useToken } from "../../lib/tokens";
import { uploadTempImage } from "../../lib/videoBlob";

export const runtime = "nodejs";

type AspectRatio = "1:1" | "9:16" | "16:9";
type Mood = "cinematic" | "bright-airy" | "high-energy" | "luxury";

type Body = {
  prompt: string;
  aspectRatio?: AspectRatio;
  mood?: Mood;
  imageBase64?: string;
  brandContext?: {
    niche?: string;
    audience?: string;
    tone?: string;
    name?: string;
    website?: string;
  };
};

// Niches where a person in frame makes sense
const PEOPLE_NICHES = [
  "personal trainer", "fitness coach", "life coach", "business coach",
  "therapist", "counselor", "speaker", "consultant", "makeup artist",
  "beauty", "chef", "nutritionist", "yoga instructor", "influencer",
  "motivational", "wellness coach", "stylist", "photographer",
  "real estate", "realtor", "broker", "agent",
];

// Words in the user's own prompt that signal they want a person visible
const PEOPLE_PROMPT_KEYWORDS = [
  "agent", "person", "man", "woman", "couple", "people", "professional",
  "trainer", "coach", "chef", "realtor", "broker", "doctor", "worker",
  "employee", "customer", "client", "team", "staff", "owner", "showing",
];

function shouldIncludePerson(niche?: string, userTopic?: string): boolean {
  const n = (niche ?? "").toLowerCase();
  const t = (userTopic ?? "").toLowerCase();
  const nicheMatch  = PEOPLE_NICHES.some((kw) => n.includes(kw));
  const topicMatch  = PEOPLE_PROMPT_KEYWORDS.some((kw) => t.includes(kw));
  return nicheMatch || topicMatch;
}

const MOOD_INSTRUCTIONS: Record<Mood, string> = {
  "cinematic":    "dramatic lighting, slow cinematic dolly or pan, shallow depth of field, moody atmosphere, film-like quality",
  "bright-airy":  "soft natural daylight, clean bright whites, open airy spaces, lifestyle feel, warm and inviting",
  "high-energy":  "dynamic sweeping camera movement, bold saturated colors, kinetic motion, fast and impactful",
  "luxury":       "slow elegant reveal, rich warm tones, premium textures and materials, upscale refined aesthetic, quiet drama",
};

const FORMAT_CONTEXT: Record<AspectRatio, string> = {
  "9:16":  "vertical 9:16 format optimised for Instagram Reels and TikTok — tall composition, close-in details",
  "1:1":   "square 1:1 format for Instagram Feed — balanced centered composition",
  "16:9":  "wide 16:9 cinematic format for Facebook and YouTube — sweeping wide shots, landscape framing",
};

async function buildVideoPromptWithGPT(
  userTopic: string,
  brand: Body["brandContext"] | undefined,
  aspectRatio: AspectRatio,
  mood: Mood
): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  const usePerson = shouldIncludePerson(brand?.niche, userTopic);
  const moodGuide = MOOD_INSTRUCTIONS[mood];
  const formatGuide = FORMAT_CONTEXT[aspectRatio];

  const systemPrompt = `You are a cinematographer writing prompts for Luma Dream Machine, an AI video model that generates 5-second clips.

Luma works best with simple, focused scenes. Your job is to write a SHORT, minimal prompt — ONE scene, ONE camera movement, ONE lighting condition. Do not describe multiple rooms, multiple objects, or sequences of events. The more you pack in, the worse the output.

Rules:
- Pick ONE specific moment or setting and describe it precisely
- ONE camera move only (slow pan, gentle dolly, subtle push-in)
- ONE lighting condition (e.g. warm afternoon light, overcast morning, soft studio light)
- 2-3 sentences — describe each element with rich, specific detail
- No lists. No "and then". No scene changes.
- NO text, logos, captions, watermarks
- NO fire, flames, candles, or any light sources that flicker
- NO complex backgrounds with many objects
${usePerson ? "- One person in frame, natural pose, wide or medium shot, not looking at camera" : "- No people — focus on the space, object, or environment only"}
- Format: ${formatGuide}
- Mood: ${moodGuide}
- Return ONLY the prompt. No explanation, no preamble.`;

  const userMessage = `Topic: "${userTopic}"
${brand?.niche ? `Industry: ${brand.niche}` : ""}
${brand?.audience ? `Audience: ${brand.audience}` : ""}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 200,
    temperature: 0.8,
  });

  return response.choices[0]?.message?.content?.trim() ?? userTopic;
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const { prompt, aspectRatio = "9:16", mood = "cinematic", imageBase64, brandContext } = body;

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

  // Build an optimised cinematic prompt with GPT-4o
  const enrichedPrompt = await buildVideoPromptWithGPT(prompt, brandContext, aspectRatio, mood);

  const luma = new LumaAI({ authToken: process.env.LUMA_API_KEY! });

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
    enrichedPrompt, // return it so UI can optionally display it
    tempBlobUrl: tempBlobUrl ?? null,
  });
}
