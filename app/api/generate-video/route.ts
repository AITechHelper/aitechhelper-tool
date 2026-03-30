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
  "consultant", "consultants", "consulting", "executive", "executives",
  "meeting", "presentation", "salesperson", "sales", "manager", "managers",
  "entrepreneur", "entrepreneurs", "investor", "investors", "advisor", "advisors",
];

function shouldIncludePerson(userTopic?: string): boolean {
  const t = (userTopic ?? "").toLowerCase();
  return PEOPLE_PROMPT_KEYWORDS.some((kw) => t.includes(kw));
}

const MOOD_INSTRUCTIONS: Record<Mood, string> = {
  "cinematic":    "shallow depth of field, rich color grading, film-like quality, dramatic contrast between foreground and background",
  "bright-airy":  "soft natural daylight, clean bright tones, warm and inviting, lifestyle feel",
  "high-energy":  "bold saturated colors, kinetic energy, high contrast, fast and impactful",
  "luxury":       "rich warm tones, premium textures and materials, upscale refined aesthetic, quiet drama",
};

const FORMAT_CONTEXT: Record<AspectRatio, string> = {
  "9:16":  "vertical 9:16 format — wide establishing shot capturing the full scene top-to-bottom: foreground elements at the bottom, main subject in the middle, background architecture or landscape filling the upper portion. Never crop or zoom in.",
  "1:1":   "square 1:1 format — wide establishing shot showing the complete environment: foreground, main subject, and background architecture or landscape all fully visible. Never crop or zoom in.",
  "16:9":  "wide 16:9 cinematic format — wide establishing shot showing the entire environment with full depth: foreground, main subject, and background architecture or landscape all in frame. Never crop or zoom in.",
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
  const usePerson   = shouldIncludePerson(userTopic);
  const moodGuide   = MOOD_INSTRUCTIONS[mood];
  const formatGuide = FORMAT_CONTEXT[aspectRatio];

  const colorHint = brand?.primaryColor
    ? `Brand color palette: primary ${brand.primaryColor}${brand.secondaryColor ? `, secondary ${brand.secondaryColor}` : ""}. Where natural, let the scene reflect these tones in surfaces, light, or environment — do not force them.`
    : "";

  const systemPrompt = `You are writing a precise scene description for Luma Dream Machine, an AI video model that generates 5-second clips.

Your job is to eliminate all ambiguity. Luma will render EXACTLY what you describe — if you don't specify it, Luma will invent it, and it will be wrong.

Structure your prompt in this EXACT order:
1. CAMERA FIRST — always a wide establishing shot. Open with: "Wide establishing shot at standing eye level, camera facing directly forward, [one slow movement: slow pan left/right, gentle dolly forward, smooth arc left/right]." This MUST be the first sentence. The camera must be far enough back to see the ENTIRE scene — foreground, subject, and background all in frame at once.
2. FOREGROUND: what is closest to the camera (furniture, plants, a path, steps)
3. MAIN SUBJECT: the primary object or space in the middle of the frame
4. BACKGROUND: what is behind — a large house facade, tall trees, a skyline, a landscape. Always describe a rich background. Never leave the background vague or empty.
5. PEOPLE & ACTION: ${usePerson ? "exactly what each person is doing with their body and hands — no vague 'standing' or 'walking', specify the exact interaction" : "no people in the scene"}
6. MOOD in one phrase only: ${moodGuide}

Hard rules:
- 3-5 sentences. No lists. No scene changes. No "and then".
- NO text, logos, captions, watermarks on screen
- NEVER a tight, close, or medium shot — always wide enough to show the full environment
- Camera height MUST be between 4 and 6 feet off the ground. NEVER overhead, drone, bird's eye, top-down, or high-angle.
- Camera movement must be HORIZONTAL ONLY — slow pan left, slow pan right, gentle dolly forward. NEVER tilt down, tilt up, or move vertically in any direction.
- Camera is ALWAYS an external observer — never POV, never from a character's perspective
- NEVER shoot subjects from behind or in silhouette
- NO backlit subjects
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
    model:        "ray-2",
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
