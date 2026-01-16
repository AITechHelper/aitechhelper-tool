import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

type Body = {
  niche?: string;
  audience?: string;
  tone?: string;
  goal?: string;
  captionLength?: "Short" | "Medium" | "Long";
  hashtagCount?: number;
  imageStyle?: string;
  // optional: user feedback later
  feedback?: string;
};

function toCaptionRules(len: Body["captionLength"]) {
  if (len === "Short") return "1 to 2 short sentences. Max 220 characters.";
  if (len === "Long") return "2 to 4 sentences. Max 600 characters.";
  return "2 to 3 sentences. Max 360 characters.";
}

function styleToPrompt(style: string | undefined) {
  switch (style) {
    case "cinematic_photo":
      return "cinematic realistic photo, shallow depth of field, natural light, high detail";
    case "product_photo":
      return "clean product photo style, studio lighting, crisp details, minimal background";
    case "minimal_illustration":
      return "minimal modern illustration, simple shapes, clean composition, soft gradients";
    case "3d_render":
      return "high quality 3D render, realistic materials, studio lighting, clean composition";
    case "flat_vector":
      return "flat vector illustration, bold shapes, minimal shading, modern design";
    case "realistic_photo":
    default:
      return "realistic photo, natural lighting, documentary style, high detail, not cartoon";
  }
}

function jsonError(message: string, details?: any, status: number = 500) {
  return NextResponse.json({ error: true, message, details }, { status });
}

function looksLikeSafetyRejection(err: any) {
  const msg = String(err?.message || "");
  const status = err?.status || err?.response?.status;
  return status === 400 && msg.toLowerCase().includes("rejected by the safety system");
}

async function rewriteImagePromptToBeSafe(client: OpenAI, originalPrompt: string) {
  const resp = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: `Rewrite this image prompt to be SAFE and policy-compliant while preserving the intended business meaning.
Rules:
- Remove or replace anything that could be unsafe (violence, weapons, drugs, self-harm, sexual content, minors, hate, extremism, illegal activity).
- Avoid brand logos and text in the image.
- Keep it PG and suitable for a general audience.
Return ONLY JSON: {"safe_prompt":"..."}

Prompt:
${originalPrompt}`,
      },
    ],
    text: { format: { type: "json_object" } },
    temperature: 0.2,
  });

  const raw = (resp.output_text || "").trim();
  const parsed = JSON.parse(raw);
  return String(parsed.safe_prompt || "").trim();
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const niche = body.niche?.trim() || "entrepreneurs";
    const audience = body.audience?.trim() || "online creators";
    const tone = body.tone?.trim() || "Bold";
    const goal = body.goal?.trim() || "Grow";
    const hashtagCount = Math.max(3, Math.min(20, Number(body.hashtagCount ?? 5)));
    const captionRules = toCaptionRules(body.captionLength || "Medium");
    const imageStylePrompt = styleToPrompt(body.imageStyle);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError("Missing OPENAI_API_KEY. Add it to .env.local and restart the dev server.");
    }

    const client = new OpenAI({ apiKey });

    // 1) Text (caption + hashtags + image_prompt)
    const instructions = `
You generate a high-quality social post package.

Rules:
- Return ONLY valid JSON. No markdown. No extra text.
- No emojis.
- No em dashes.
- Caption should be useful and specific (avoid generic hype).
- hashtags must be a SINGLE LINE of space-separated hashtags, exactly ${hashtagCount} hashtags.
`;

    const input = `
Niche: ${niche}
Audience: ${audience}
Tone: ${tone}
Goal: ${goal}
Caption rules: ${captionRules}

Return JSON with keys:
caption: string
hashtags: string
image_prompt: string (single image prompt matching niche + goal; keep it safe and PG)
`;

    const textResp = await client.responses.create({
      model: "gpt-4.1-mini",
      input,
      instructions,
      temperature: 0.7,
      text: { format: { type: "json_object" } },
    });

    const raw = (textResp.output_text || "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return jsonError("Model did not return valid JSON.", { raw: raw.slice(0, 1200) });
    }

    const caption = String(parsed.caption || "").trim();
    const hashtags = String(parsed.hashtags || "").trim();
    const imagePromptFromModel = String(parsed.image_prompt || "").trim();

    if (!caption || !hashtags) {
      return jsonError("Model returned empty caption or hashtags.", { raw: raw.slice(0, 1200) });
    }

    let imagePrompt = [
      imageStylePrompt,
      `topic: ${niche}`,
      `audience: ${audience}`,
      `goal: ${goal}`,
      imagePromptFromModel ? `scene: ${imagePromptFromModel}` : "",
      "PG, safe, no violence, no weapons, no drugs",
      "no text, no watermark, no logos, no UI",
    ]
      .filter(Boolean)
      .join(", ");

    // 2) Image (try once, if safety rejection then rewrite prompt and retry once)
    async function generateImage(prompt: string) {
      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      const b64 = img.data?.[0]?.b64_json;
      if (!b64) throw new Error("Image generation failed (no data returned).");
      return `data:image/png;base64,${b64}`;
    }

    let imageBase64: string;
    try {
      imageBase64 = await generateImage(imagePrompt);
    } catch (err: any) {
      if (looksLikeSafetyRejection(err)) {
        // rewrite and retry once
        const safer = await rewriteImagePromptToBeSafe(client, imagePrompt);
        if (!safer) return jsonError("Safety rejection and failed to rewrite prompt.", { err: err?.message });
        imagePrompt = safer;
        imageBase64 = await generateImage(imagePrompt);
      } else {
        return jsonError("Image generation failed.", { message: err?.message, status: err?.status });
      }
    }

    return NextResponse.json({
      result: {
        caption,
        hashtags,
        why: "",
        imageBase64,
        imagePrompt,
      },
    });
  } catch (err: any) {
    console.error("❌ /api/generate crashed:", err);
    return jsonError(err?.message || "Server error", err?.stack || String(err));
  }
}
