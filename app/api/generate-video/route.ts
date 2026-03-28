// app/api/generate-video/route.ts
// Starts a Luma Dream Machine video generation job.
// Uses GPT-4o to build a cinematic prompt AND generate caption + hashtags in parallel.
// Returns { generationId, enrichedPrompt, caption, hashtags, tempBlobUrl? } immediately.

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
  tone?: string;
  captionLength?: "Short" | "Medium" | "Long";
  hashtagCount?: number;
  imageBase64?: string;
  brandContext?: {
    niche?: string;
    audience?: string;
    tone?: string;
    name?: string;
    website?: string;
    primaryColor?: string;
    secondaryColor?: string;
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

const PEOPLE_PROMPT_KEYWORDS = [
  "agent", "person", "man", "woman", "couple", "people", "professional",
  "trainer", "coach", "chef", "realtor", "broker", "doctor", "worker",
  "employee", "customer", "client", "team", "staff", "owner", "showing",
];

function shouldIncludePerson(niche?: string, userTopic?: string): boolean {
  const n = (niche ?? "").toLowerCase();
  const t = (userTopic ?? "").toLowerCase();
  return (
    PEOPLE_NICHES.some((kw) => n.includes(kw)) ||
    PEOPLE_PROMPT_KEYWORDS.some((kw) => t.includes(kw))
  );
}

const MOOD_INSTRUCTIONS: Record<Mood, string> = {
  "cinematic":    "dramatic lighting, slow cinematic dolly or pan, shallow depth of field, moody atmosphere, film-like quality",
  "bright-airy":  "soft natural daylight, clean bright whites, open airy spaces, lifestyle feel, warm and inviting",
  "high-energy":  "dynamic sweeping camera movement, bold saturated colors, kinetic motion, fast and impactful",
  "luxury":       "slow elegant reveal, rich warm tones, premium textures and materials, upscale refined aesthetic, quiet drama",
};

const FORMAT_CONTEXT: Record<AspectRatio, string> = {
  "9:16":  "vertical 9:16 format for Instagram Reels and TikTok — tall composition, close-in details",
  "1:1":   "square 1:1 format for Instagram Feed — balanced centered composition",
  "16:9":  "wide 16:9 cinematic format for Facebook and YouTube — sweeping wide shots, landscape framing",
};

function captionMaxChars(len?: "Short" | "Medium" | "Long") {
  if (len === "Short") return 160;
  if (len === "Long")  return 360;
  return 240;
}

// ── Build the Luma video prompt ──────────────────────────────────────────────

async function buildVideoPrompt(
  openai: OpenAI,
  userTopic: string,
  brand: Body["brandContext"] | undefined,
  aspectRatio: AspectRatio,
  mood: Mood,
): Promise<string> {
  const usePerson   = shouldIncludePerson(brand?.niche, userTopic);
  const moodGuide   = MOOD_INSTRUCTIONS[mood];
  const formatGuide = FORMAT_CONTEXT[aspectRatio];

  const colorHint = brand?.primaryColor
    ? `Brand color palette: primary ${brand.primaryColor}${brand.secondaryColor ? `, secondary ${brand.secondaryColor}` : ""}. Where natural, let the scene reflect these tones in surfaces, light, or environment — do not force them.`
    : "";

  const systemPrompt = `You are writing a precise scene description for Luma Dream Machine, an AI video model that generates 5-second clips.

Your job is to eliminate all ambiguity. Luma will render EXACTLY what you describe — if you don't specify it, Luma will invent it, and it will be wrong.

Structure your prompt in this order:
1. ENVIRONMENT: exact room or location (e.g. "a modern home office with a white desk", "a bright open-plan office", "a clean kitchen counter") — be specific, not generic
2. OBJECTS: every key prop that must appear (e.g. "a open laptop showing a dashboard", "a coffee mug", "printed floor plans on the desk") — name them explicitly
3. PEOPLE & ACTION: ${usePerson ? "exactly what each person is doing with their body and hands (e.g. 'a man in a blazer seated at the desk, pointing at the laptop screen while a second person leans in to look') — no vague 'standing' or 'walking', specify the exact interaction" : "no people — describe only the objects and environment in detail"}
4. CAMERA: one specific shot (medium shot, close-up on hands, slow push toward the screen) — eye level only, external observer, never POV or overhead
5. MOOD in one phrase only: ${moodGuide}

Hard rules:
- 3-5 sentences. No lists. No scene changes. No "and then".
- NO text, logos, captions, watermarks on screen
- NO fire, flames, candles, flickering light
- NO overhead, bird's eye, top-down, or POV camera angles
- Camera is ALWAYS an external observer, never from a character's point of view
- Format: ${formatGuide}
${colorHint}
- Return ONLY the prompt. No explanation, no preamble.`;

  const userMessage = [
    `Topic: "${userTopic}"`,
    brand?.niche    ? `Business type: ${brand.niche}`    : "",
    brand?.audience ? `Target audience: ${brand.audience}` : "",
    `Describe the exact scene that visually represents this topic. Be specific about what objects are on screen, what the person is doing with their hands, and the exact setting. Do not leave anything open to interpretation.`,
  ].filter(Boolean).join("\n");

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage   },
    ],
    max_tokens: 250,
    temperature: 0.8,
  });

  return res.choices[0]?.message?.content?.trim() ?? userTopic;
}

// ── Generate caption + hashtags ──────────────────────────────────────────────

async function generateCaption(
  openai: OpenAI,
  userTopic: string,
  brand: Body["brandContext"] | undefined,
  tone: string,
  captionLength: "Short" | "Medium" | "Long",
  hashtagCount: number,
): Promise<{ caption: string; hashtags: string }> {
  const maxChars  = captionMaxChars(captionLength);
  const niche     = brand?.niche    || "business";
  const audience  = brand?.audience || "customers";

  const systemPrompt = `You are a social media copywriter writing a caption for a short branded video.

Rules:
- Write for ${niche} targeting ${audience}
- Tone: ${tone}
- Max ${maxChars} characters for the caption body (not counting hashtags)
- Start with a strong hook — first line must stop the scroll
- No emojis unless they feel completely natural
- No generic filler phrases ("In today's world", "Are you ready?")
- Do NOT mention the video itself or that this is a video post
- End with a natural call to action
- Generate exactly ${hashtagCount} relevant hashtags (return as a single space-separated string, each starting with #)
- Return JSON: { "caption": "...", "hashtags": "..." }`;

  const userMessage = `Video topic: "${userTopic}"`;

  const res = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user",   content: userMessage   },
    ],
    max_tokens: 400,
    temperature: 0.75,
    response_format: { type: "json_object" },
  });

  try {
    const parsed = JSON.parse(res.choices[0]?.message?.content ?? "{}");
    return {
      caption:  String(parsed.caption  ?? ""),
      hashtags: String(parsed.hashtags ?? ""),
    };
  } catch {
    return { caption: "", hashtags: "" };
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Body;
  const {
    prompt,
    aspectRatio    = "9:16",
    mood           = "cinematic",
    tone           = "Confident",
    captionLength  = "Medium",
    hashtagCount   = 12,
    imageBase64,
    brandContext,
  } = body;

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

  await useToken(userId);
  await useToken(userId);

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // Build video prompt + caption in parallel
  const [enrichedPrompt, captionResult] = await Promise.all([
    buildVideoPrompt(openai, prompt, brandContext, aspectRatio, mood),
    generateCaption(openai, prompt, brandContext, tone, captionLength, hashtagCount),
  ]);

  // Start Luma generation
  const luma   = new LumaAI({ authToken: process.env.LUMA_API_KEY! });
  let tempBlobUrl: string | undefined;

  const params: Parameters<typeof luma.generations.video.create>[0] = {
    model:        "ray-flash-2",
    prompt:       enrichedPrompt,
    aspect_ratio: aspectRatio,
    duration:     "5s",
  };

  if (imageBase64) {
    tempBlobUrl = await uploadTempImage(imageBase64);
    params.keyframes = { frame0: { type: "image", url: tempBlobUrl } };
  }

  const generation = await luma.generations.video.create(params);

  return NextResponse.json({
    generationId:   generation.id,
    enrichedPrompt,
    caption:        captionResult.caption,
    hashtags:       captionResult.hashtags,
    tempBlobUrl:    tempBlobUrl ?? null,
  });
}
