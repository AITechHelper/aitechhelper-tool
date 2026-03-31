// app/api/generate-video/route.ts
// Starts a Runway Gen-4 video generation job.
// Uses GPT-4o to build a cinematic prompt AND generate caption + hashtags in parallel.
// Returns { generationId, enrichedPrompt, caption, hashtags, tempBlobUrl? } immediately.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import RunwayML from "@runwayml/sdk";
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

// Runway ratio strings
// text-to-video gen4.5 only supports 1280:720 and 720:1280 — 1:1 falls back to 720:1280
const TEXT_RATIO: Record<AspectRatio, "1280:720" | "720:1280"> = {
  "9:16":  "720:1280",
  "1:1":   "720:1280",  // gen4.5 text-to-video doesn't support square
  "16:9":  "1280:720",
};

// image-to-video gen4_turbo supports square
const IMAGE_RATIO: Record<AspectRatio, "1280:720" | "720:1280" | "960:960" | "1104:832" | "832:1104" | "1584:672"> = {
  "9:16":  "720:1280",
  "1:1":   "960:960",
  "16:9":  "1280:720",
};


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

// ── Build the Runway video prompt ─────────────────────────────────────────────

async function buildVideoPrompt(
  openai: OpenAI,
  userTopic: string,
  brand: Body["brandContext"] | undefined,
  aspectRatio: AspectRatio,
  mood: Mood,
): Promise<string> {
  const moodGuide   = MOOD_INSTRUCTIONS[mood];
  const formatGuide = FORMAT_CONTEXT[aspectRatio];

  const colorHint = brand?.primaryColor
    ? `Brand color palette: primary ${brand.primaryColor}${brand.secondaryColor ? `, secondary ${brand.secondaryColor}` : ""}. Where natural, let the scene reflect these tones in surfaces, light, or environment — do not force them.`
    : "";

  const systemPrompt = `You are writing a precise scene description for Runway Gen-4, an AI video model that generates 5-second photorealistic clips.

Your job is to eliminate all ambiguity. Runway will render EXACTLY what you describe — if you don't specify it, Runway will invent it, and it will be wrong.

Structure your prompt in this EXACT order:
1. CAMERA FIRST — always a wide establishing shot. Open with: "Wide establishing shot at standing eye level, camera facing directly forward, [choose the movement that best reveals this specific scene: slow pan left/right for wide spaces, slow tilt up for tall subjects, gentle dolly forward for depth, slow orbit for a central subject]." This MUST be the first sentence. The camera must be far enough back to see the ENTIRE scene — foreground, subject, and background all in frame at once.
2. LIGHTING: specify the time of day (e.g. golden hour, midday, overcast morning) and the direction of the main light source (e.g. soft diffused natural light from camera-left, warm sunlight from camera-right). Be explicit — never leave lighting unspecified.
3. FOREGROUND: what is closest to the camera (furniture, plants, a path, steps)
4. MAIN SUBJECT: the primary object or space in the middle of the frame
5. BACKGROUND: what is behind — a large house facade, tall trees, a skyline, a landscape. Always describe a rich background. Never leave the background vague or empty.
6. PEOPLE & ACTION: If the topic mentions any person, role, or profession (roofer, doctor, agent, chef, plumber, stylist, teacher, etc.) include them. If the topic is purely about a product, property, or place with no person implied, omit people. When people are included: describe at most 2 with specific HELD POSES only — never mid-motion actions. Describe the frozen position: 'right hand extended holding a clipboard', 'both hands resting on the counter'. All other people stand or sit naturally with no described action. NEVER describe clapping, waving, gesturing mid-air, or any motion-in-progress.
7. MOOD in one phrase only: ${moodGuide}

Hard rules:
- Photorealistic. No stylized, illustrated, painterly, or animated look.
- 4-6 sentences. No lists. No scene changes. No "and then".
- NO text, logos, captions, watermarks on screen
- NEVER a tight, close, or medium shot — always wide enough to show the full environment
- Camera height MUST be between 4 and 6 feet off the ground. NEVER overhead, drone, bird's eye, top-down, or high-angle.
- Camera movement must be chosen to best reveal the scene: slow pan left/right for wide landscapes and interiors, slow tilt up for tall subjects like buildings or trees, gentle dolly forward for depth and intimacy, slow orbit for objects or people. Pick whichever movement makes the scene feel most cinematic.
- Camera is ALWAYS an external observer — never POV, never from a character's perspective
- NEVER shoot subjects from behind or in silhouette
- NO backlit subjects
- NEVER describe physical states abstractly (sweaty, tired, excited, relieved). Instead describe only what is visually observable: "flushed cheeks", "sleeves rolled up", "slight smile". Runway renders concepts literally and incorrectly — only describe what the camera would actually see.
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
    max_tokens: 350,
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

  // Start Runway generation
  const runway = new RunwayML({ apiKey: process.env.RUNWAYML_API_SECRET! });
  let tempBlobUrl: string | undefined;
  let task: { id: string };

  if (imageBase64) {
    // Image-to-video: gen4_turbo
    tempBlobUrl = await uploadTempImage(imageBase64);
    task = await runway.imageToVideo.create({
      model:       "gen4_turbo",
      promptImage: tempBlobUrl,
      promptText:  enrichedPrompt,
      ratio:       IMAGE_RATIO[aspectRatio],
      duration:    5,
    });
  } else {
    // Text-to-video: gen4.5
    task = await runway.textToVideo.create({
      model:      "gen4.5",
      promptText: enrichedPrompt,
      ratio:      TEXT_RATIO[aspectRatio],
      duration:   5,
    });
  }

  return NextResponse.json({
    generationId:   task.id,
    enrichedPrompt,
    caption:        captionResult.caption,
    hashtags:       captionResult.hashtags,
    tempBlobUrl:    tempBlobUrl ?? null,
  });
}
