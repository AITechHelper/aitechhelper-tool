// app/api/generate/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

/* ----------------------------- Types ----------------------------- */

type DayContext = {
  day: string;
  title: string;
  detail: string;
};

type Body = {
  // required-ish
  niche?: string;
  audience?: string;

  // form fields (USE ALL)
  platform?: string;
  postType?: string;
  callToAction?: string;
  visualFocus?: string;

  tone?: string;
  goal?: string;
  captionLength?: "Short" | "Medium" | "Long";
  hashtagCount?: number;
  imageStyle?: string;

  // brand colors
  primaryColor?: string;
  secondaryColor?: string;

  // extra context
  dayContext?: DayContext | null;

  // reference image (data URL)
  referenceImageDataUrl?: string | null;

  // refinement (one-time)
  refinementText?: string;

  // NOTE: you can add this to your form later if you want
  specificRequest?: string;
};

/* ------------------------- Helpers ------------------------- */

function jsonError(message: string, details?: any, status = 500) {
  return NextResponse.json({ error: true, message, details }, { status });
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function captionMax(len?: Body["captionLength"]) {
  // tighter than before
  if (len === "Short") return 140;
  if (len === "Long") return 360;
  return 240; // Medium default
}

function styleToPrompt(style?: string) {
  switch (style) {
    case "cinematic_photo":
      return "cinematic realistic photo, shallow depth of field, dramatic but natural lighting, high detail";
    case "product_photo":
      return "clean product photo, studio lighting, crisp details, minimal background, premium ecommerce look";
    case "minimal_illustration":
      return "minimal modern illustration, simple shapes, clean composition, soft gradients";
    case "3d_render":
      return "high quality 3D render, realistic materials, studio lighting, clean composition";
    case "flat_vector":
      return "flat vector illustration, bold shapes, minimal shading, modern design";
    case "realistic_photo":
    default:
      return "realistic photo, natural lighting, high detail, not cartoon";
  }
}

function platformToFraming(platform?: string) {
  // we generate 1024x1024, but composition guidance still helps
  const p = (platform || "").toLowerCase();
  if (p.includes("tiktok") || p.includes("short")) {
    return "composition suitable for vertical short-form (subject centered with safe margins for cropping)";
  }
  if (p.includes("linkedin")) {
    return "professional, clean composition suitable for LinkedIn feed";
  }
  if (p.includes("x") || p.includes("twitter")) {
    return "bold, simple composition readable at small sizes";
  }
  if (p.includes("facebook")) {
    return "friendly, warm, broad-audience composition";
  }
  return "composition suitable for Instagram feed";
}

function visualFocusToImageRule(visualFocus?: string) {
  const v = (visualFocus || "").toLowerCase();
  if (v.includes("product"))
    return "focus strongly on the product as the hero subject";
  if (v.includes("person"))
    return "include a person interacting naturally with the product";
  if (v.includes("lifestyle"))
    return "lifestyle scene that shows the product in use";
  if (v.includes("before/after"))
    return "before/after style layout using props and staging (no text labels)";
  if (v.includes("close-up"))
    return "close-up detail shot emphasizing texture and materials";
  if (v.includes("text overlay"))
    return "leave clean negative space for a minimal text overlay (DO NOT render any text)";
  return "";
}

function postTypeToCreativeDirection(postType?: string) {
  const t = (postType || "").toLowerCase();
  if (t.includes("educ")) return "educational vibe: helpful and specific";
  if (t.includes("promo")) return "promotional vibe: offer-forward and clear";
  if (t.includes("testimonial"))
    return "testimonial vibe: social proof, trustworthy";
  if (t.includes("behind"))
    return "behind-the-scenes vibe: authentic and candid";
  if (t.includes("tip")) return "tip-list vibe: practical and useful";
  if (t.includes("story")) return "story vibe: narrative, warm, relatable";
  if (t.includes("announce")) return "announcement vibe: crisp, direct, newsy";
  return "general vibe: high quality and engaging";
}

function normalizeHex(hex?: string) {
  const h = String(hex || "").trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

function looksLikeSafetyRejection(err: any) {
  const msg = String(err?.message || "");
  const status = err?.status || err?.response?.status;
  return (
    status === 400 &&
    msg.toLowerCase().includes("rejected by the safety system")
  );
}

async function rewriteImagePromptToBeSafe(
  client: OpenAI,
  originalPrompt: string
) {
  const resp = await client.responses.create({
    model: "gpt-4.1-mini",
    input: [
      {
        role: "user",
        content: `Rewrite this image instruction to be SAFE and policy-compliant while preserving intent.

Rules:
- Remove/replace anything unsafe.
- Avoid logos/brand names/readable text.
- Keep it PG.
Return ONLY JSON: {"safe_prompt":"..."}

Prompt:
${originalPrompt}`,
      },
    ],
    text: { format: { type: "json_object" } },
    temperature: 0.2,
  });

  const raw = (resp.output_text || "").trim();
  const parsed = JSON.parse(raw || "{}");
  return String(parsed.safe_prompt || "").trim();
}

/* ---------- dataURL -> Blob (SDK accepts Blob; avoid TS "File" errors) ---------- */
function dataUrlToBlob(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match)
    throw new Error("Invalid referenceImageDataUrl (expected data URL).");
  const mime = match[1];
  const b64 = match[2];
  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: mime });
  // give it a name for multipart upload
  (blob as any).name = filename;
  return blob as any;
}

/* ----------------------------- POST ----------------------------- */

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return jsonError(
        "Missing OPENAI_API_KEY. Add it to .env.local (local) or Vercel env vars (prod) and restart."
      );
    }

    const client = new OpenAI({ apiKey });

    // Required-ish
    const niche = body.niche?.trim() || "business";
    const audience = body.audience?.trim() || "customers";

    // Form fields (USE ALL)
    const platform = body.platform?.trim() || "Instagram";
    const postType = body.postType?.trim() || "Educational";
    const callToAction = body.callToAction?.trim() || "Comment";
    const visualFocus = body.visualFocus?.trim() || "Product";

    const tone = body.tone?.trim() || "Confident";
    const goal = body.goal?.trim() || "Get more engagement";

    const maxCaptionChars = captionMax(body.captionLength);
    const hashtagCount = clampInt(Number(body.hashtagCount ?? 8), 0, 30);

    const stylePrompt = styleToPrompt(body.imageStyle);
    const framing = platformToFraming(platform);
    const focusRule = visualFocusToImageRule(visualFocus);
    const typeDirection = postTypeToCreativeDirection(postType);

    const primaryColor = normalizeHex(body.primaryColor);
    const secondaryColor = normalizeHex(body.secondaryColor);

    const colorLock =
      primaryColor || secondaryColor
        ? [
            "IMPORTANT: Brand colors are TOP priority and must dominate the image.",
            primaryColor
              ? `Primary brand color: ${primaryColor} must be dominant.`
              : "",
            secondaryColor
              ? `Secondary brand color: ${secondaryColor} must be a clear accent.`
              : "",
            "Use mostly neutrals (black/white/gray/cream) beyond brand colors. Avoid other strong colors.",
          ]
            .filter(Boolean)
            .join(" ")
        : "";

    const dayContext = body.dayContext
      ? `Calendar context: Day ${body.dayContext.day}. Title: ${body.dayContext.title}. Detail: ${body.dayContext.detail}.`
      : "";

    const specificRequest = String(body.specificRequest || "").trim();
    const refinement = String(body.refinementText || "").trim();

    /* ---------------- Text generation (caption + hashtags + image scene) ---------------- */

    const instructions = `
You generate a high-quality social post package.

Hard rules:
- Return ONLY valid JSON. No markdown. No extra keys.
- No emojis.
- Caption MUST be <= ${maxCaptionChars} characters.
- Caption must NOT describe the image or the scene (no "picture this", "showing", "in the photo", etc).
- Caption MUST match platform + post type + tone + goal.
- Caption MUST end with the call-to-action exactly: "${callToAction}" (case-sensitive).
- If Specific request is provided, caption MUST include it clearly and directly (do not paraphrase away the offer).
- Hashtags must be ONE line of space-separated hashtags, exactly ${hashtagCount} hashtags (0 allowed if hashtagCount is 0).
- The image_prompt must be visual-only instructions. No brand names. No readable text.
`;

    const input = `
Niche: ${niche}
Audience: ${audience}
Platform: ${platform}
Post type: ${postType}
Tone: ${tone}
Goal: ${goal}
Visual focus: ${visualFocus}
Brand colors: primary=${primaryColor || "none"}, secondary=${secondaryColor || "none"}
${dayContext ? dayContext : ""}

Specific request (if any):
${specificRequest || "none"}

Return JSON:
{
  "caption": string,
  "hashtags": string,
  "image_prompt": string
}

Guidance:
- Caption: short, specific, and human. No scene narration. End with CTA.
- image_prompt: describe subject, setting, lighting, props, composition. Must respect Visual focus + Brand colors + Platform framing.
`;

    const textResp = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      input,
      temperature: 0.6,
      text: { format: { type: "json_object" } },
    });

    const raw = (textResp.output_text || "").trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw || "{}");
    } catch {
      return jsonError("Model did not return valid JSON.", {
        raw: raw.slice(0, 1200),
      });
    }

    let caption = String(parsed.caption || "").trim();
    let hashtags = String(parsed.hashtags || "").trim();
    const scene = String(parsed.image_prompt || "").trim();

    // Safety clamps: hard enforce caption length
    if (caption.length > maxCaptionChars)
      caption = caption.slice(0, maxCaptionChars).trim();

    // Ensure CTA is present at the end (and prevent "prompt leaking" style text)
    if (!caption.endsWith(callToAction)) {
      caption = `${caption.replace(/\s+$/g, "")} ${callToAction}`.trim();
      if (caption.length > maxCaptionChars) {
        // keep CTA; trim front
        const keep = ` ${callToAction}`;
        caption =
          caption.slice(0, Math.max(0, maxCaptionChars - keep.length)).trim() +
          keep;
      }
    }

    if (typeof hashtagCount === "number" && hashtagCount === 0) {
      hashtags = "";
    } else {
      // If model returns commas/newlines, normalize
      hashtags = hashtags.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    if (!caption)
      return jsonError("Model returned empty caption.", {
        raw: raw.slice(0, 1200),
      });

    /* ---------------- Image instruction (USES ALL form fields) ---------------- */

    const imageInstructionParts = [
      stylePrompt,
      framing,
      typeDirection,
      `Create an image for niche: ${niche}. Audience: ${audience}. Goal: ${goal}. Tone: ${tone}.`,
      focusRule ? `Visual focus rule: ${focusRule}.` : "",
      scene ? `Scene requirements: ${scene}.` : "",
      specificRequest
        ? `HARD REQUIREMENTS (respect if visual): ${specificRequest}.`
        : "",
      colorLock ? colorLock : "",
      dayContext ? `Optional seasonal/context hint: ${dayContext}` : "",
      refinement ? `Apply ONLY this change: ${refinement}.` : "",
      "Photorealistic, premium brand photo quality.",
      "No readable text, no brand names, no logos, no watermarks.",
    ];

    let imageInstruction = imageInstructionParts.filter(Boolean).join(" ");

    /* ---------------- Image generation/edit ---------------- */

    async function doGenerate(prompt: string) {
      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });
      const b64 = img.data?.[0]?.b64_json;
      if (!b64) throw new Error("Image generation failed (no data returned).");
      return { b64, usedPrompt: prompt };
    }

    async function doEdit(prompt: string, dataUrl: string) {
      const refBlob = dataUrlToBlob(dataUrl, "reference.png");

      // keep TS happy across SDK versions
      const img = await (client.images as any).edit({
        model: "gpt-image-1",
        image: refBlob,
        prompt,
        size: "1024x1024",
      });

      const b64 = img.data?.[0]?.b64_json;
      if (!b64) throw new Error("Image edit failed (no data returned).");
      return { b64, usedPrompt: prompt };
    }

    let b64: string;

    try {
      const hasRef =
        body.referenceImageDataUrl &&
        body.referenceImageDataUrl.startsWith("data:image/");

      if (hasRef) {
        // When a reference image exists, editing tends to preserve packaging/vibe better
        const out = await doEdit(imageInstruction, body.referenceImageDataUrl!);
        b64 = out.b64;
        imageInstruction = out.usedPrompt;
      } else {
        const out = await doGenerate(imageInstruction);
        b64 = out.b64;
        imageInstruction = out.usedPrompt;
      }
    } catch (err: any) {
      if (looksLikeSafetyRejection(err)) {
        const safer = await rewriteImagePromptToBeSafe(
          client,
          imageInstruction
        );
        if (!safer) {
          return jsonError("Safety rejection and failed to rewrite prompt.", {
            err: err?.message,
          });
        }

        const hasRef =
          body.referenceImageDataUrl &&
          body.referenceImageDataUrl.startsWith("data:image/");

        if (hasRef) {
          const out2 = await doEdit(safer, body.referenceImageDataUrl!);
          b64 = out2.b64;
          imageInstruction = safer;
        } else {
          const out2 = await doGenerate(safer);
          b64 = out2.b64;
          imageInstruction = safer;
        }
      } else {
        return jsonError("Image generation failed.", {
          message: err?.message,
          status: err?.status,
        });
      }
    }

    return NextResponse.json({
      result: {
        caption,
        hashtags,
        why: "",
        imageBase64: `data:image/png;base64,${b64}`,
        imagePrompt: imageInstruction,
      },
    });
  } catch (err: any) {
    console.error("❌ /api/generate crashed:", err);
    return jsonError(err?.message || "Server error", err?.stack || String(err));
  }
}
