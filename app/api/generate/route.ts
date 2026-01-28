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
  niche?: string;
  audience?: string;

  // Page.tsx
  tone?: string;
  goal?: string; // post type label
  specificRequest?: string; // unlocked textbox under post type

  captionLength?: "Short" | "Medium" | "Long";
  hashtagCount?: number;

  // NEW image styles:
  // "lifestyle_photo" | "branding_photo" | "branding_text_photo" | "branding_text_only"
  imageStyle?: string;

  primaryColor?: string;
  secondaryColor?: string;

  dayContext?: DayContext | null;

  referenceImageDataUrl?: string | null;

  refinementText?: string;

  callToAction?: string;
};

type PostTypeGuidance = {
  caption: string;
  image: string;
};

/* ------------------------- Helpers ------------------------- */

function jsonError(message: string, details?: any, status = 500) {
  return NextResponse.json({ error: true, message, details }, { status });
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeHex(hex?: string) {
  const h = String(hex || "").trim();
  if (!h) return "";
  return h.startsWith("#") ? h : `#${h}`;
}

function captionMax(len?: Body["captionLength"]) {
  if (len === "Short") return 120;
  if (len === "Long") return 280;
  return 180;
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
- Avoid logos/brand names/readable text unless explicitly allowed by the style.
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

/* ---------- dataURL -> Blob ---------- */
function dataUrlToBlob(dataUrl: string, filename: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match)
    throw new Error("Invalid referenceImageDataUrl (expected data URL).");
  const mime = match[1];
  const b64 = match[2];
  const bytes = Buffer.from(b64, "base64");
  const blob = new Blob([bytes], { type: mime });
  (blob as any).name = filename;
  return blob as any;
}

/* ----------------- Image Style Specs (your 4 examples) ----------------- */

type StyleSpec = {
  allowText: boolean;
  photoRequired: boolean;
  brandingStrength: "none" | "light" | "heavy";
  banProducts: boolean; // ban product packaging, labels, bags, bottles, boxes, etc.
  basePrompt: string;
  layoutHint: string;
};

function getStyleSpec(styleRaw?: string): StyleSpec {
  const style = String(styleRaw || "").trim();

  // 1) Lifestyle photo — NO text, NO products, very light branding
  if (style === "lifestyle_photo") {
    return {
      allowText: false,
      photoRequired: true,
      brandingStrength: "light",
      banProducts: true,
      basePrompt: `
REALISTIC lifestyle photography.
Authentic candid moment or environment scene.
Fits the niche through context (setting / activity), NOT products.
NO readable text. NO logos. NO packaging. NO close-ups of branded items.
Natural lighting, shallow depth of field, high-end commercial photo.
Looks organic and unposed (not stock-photo cheesy).
`,
      layoutHint: `
Lifestyle framing, natural composition.
Keep branding minimal: tiny accent colors only (if any).
`,
    };
  }

  // 2) Branding + photo — NO text, heavy brand design
  if (style === "branding_photo") {
    return {
      allowText: false,
      photoRequired: true,
      brandingStrength: "heavy",
      banProducts: true,
      basePrompt: `
REALISTIC photo used as the base layer.
Strong branded graphic design elements layered on top.
Use brand colors via frames, shapes, borders, gradients, and overlays.
NO readable text. NO logos. NO packaging. NO labels.
Photo must remain visible and realistic.
Modern Instagram feed composition, premium brand aesthetic.
`,
      layoutHint: `
Use bold brand color blocks/shapes with a clean grid.
Leave negative space like a designed post, but DO NOT render text.
`,
    };
  }

  // 3) Branding + text + photo — text allowed
  if (style === "branding_text_photo") {
    return {
      allowText: true,
      photoRequired: true,
      brandingStrength: "heavy",
      banProducts: true,
      basePrompt: `
REALISTIC photo as the base layer.
Branded layout with intentional areas for headline text.
Brand colors dominate the design; high contrast, premium look.
Typography is EXPECTED and intentional (clean, modern, readable).
NO logos. Avoid brand names. Avoid packaging and labels.
Photo supports the message.
`,
      layoutHint: `
Headline + subhead style layout (like a real IG post).
Bold but clean typography hierarchy.
`,
    };
  }

  // 4) Branding + text only — no photo
  if (style === "branding_text_only") {
    return {
      allowText: true,
      photoRequired: false,
      brandingStrength: "heavy",
      banProducts: true,
      basePrompt: `
GRAPHIC DESIGN ONLY (NO photo, NO photorealism).
Typography-driven layout with brand colors dominating.
Modern, premium, high-contrast design.
Clear hierarchy; looks custom-designed (not templated).
NO logos. Avoid brand names.
`,
      layoutHint: `
Use a strong grid, spacing, and typographic hierarchy.
Add subtle pattern texture / dots / lines for depth.
`,
    };
  }

  // Default fallback: treat like lifestyle_photo (safe)
  return {
    allowText: false,
    photoRequired: true,
    brandingStrength: "light",
    banProducts: true,
    basePrompt: `
REALISTIC lifestyle/commercial photography.
Natural lighting, high quality, no illustration/cartoon.
NO readable text. NO logos. NO packaging.
`,
    layoutHint: `
Clean commercial composition.
`,
  };
}

/* ----------------- Post type (goal) guidance ----------------- */

function postTypeToGuidance(postType?: string): PostTypeGuidance {
  const t = String(postType || "").toLowerCase();

  if (t.includes("basic")) {
    return {
      caption: "General brand post within the niche. Do not invent specifics.",
      image:
        "Simple, high-quality visual fitting the niche. Do not invent products/packaging.",
    };
  }

  if (t.includes("promotion") || t.includes("offer")) {
    return {
      caption:
        "Promotion/offer. If specificRequest is provided, include it exactly. If blank, do NOT invent a discount or date; keep it generic.",
      image:
        "Promotional energy without inventing product packaging. Show service-in-action or lifestyle cues (hands holding a cup, café scene, person enjoying the niche).",
    };
  }

  if (t.includes("educational") || t.includes("tips")) {
    return {
      caption:
        "Educational tip. If specificRequest is provided, use it. If blank, choose a safe generic tip relevant to niche.",
      image:
        "Helpful, clean visual consistent with niche; avoid products/packaging unless a reference image is provided.",
    };
  }

  if (t.includes("problem") && t.includes("solution")) {
    return {
      caption:
        "Problem → solution. Describe a common pain point and a simple solution. If blank specifics, keep it general.",
      image:
        "Visual hinting at problem/solution concept without text unless style allows it. Do not invent products.",
    };
  }

  if (t.includes("before") && t.includes("after")) {
    return {
      caption:
        "Before/After transformation. Keep it believable and niche-relevant. If blank specifics, generic transformation.",
      image:
        "Split composition before/after using visuals (no text labels unless style allows). No products/packaging.",
    };
  }

  if (t.includes("testimonial") || t.includes("social proof")) {
    return {
      caption:
        "Testimonial/social proof. If specificRequest contains the testimonial, include it or a short excerpt.",
      image:
        "Trustworthy, warm, credible visual. Avoid products/packaging; lean people/service/process.",
    };
  }

  if (t.includes("behind")) {
    return {
      caption:
        "Behind-the-scenes. Authentic process/day-in-the-life. No fake claims.",
      image:
        "Candid behind-the-scenes scene aligned to niche. No packaging/labels.",
    };
  }

  if (t.includes("announcement") || t.includes("update")) {
    return {
      caption:
        "Announcement/update. If specifics provided, include them. If blank, keep it generic and safe.",
      image:
        "On-brand supportive visual. The announcement mostly lives in caption unless style allows text.",
    };
  }

  if (t.includes("engagement") || t.includes("conversation")) {
    return {
      caption:
        "Engagement starter. Ask a niche-relevant question. If blank specifics, keep it broad and safe.",
      image: "Friendly niche photo or branded layout depending on style.",
    };
  }

  if (t.includes("seasonal") || t.includes("timely")) {
    return {
      caption:
        "Seasonal/timely. Only be seasonal if user gave specifics; otherwise generic.",
      image: "Seasonal vibe only if specified; otherwise generic niche visual.",
    };
  }

  if (t.includes("authority") || t.includes("credibility")) {
    return {
      caption:
        "Authority/credibility. Competent, trustworthy. No unverifiable claims.",
      image: "Premium credible visual consistent with niche and style.",
    };
  }

  if (t.includes("custom")) {
    return {
      caption:
        "Custom. Follow specificRequest as primary instruction. If blank, keep it generic and safe.",
      image:
        "Follow specificRequest visually, but stay safe and avoid brands/logos unless style requires generic text.",
    };
  }

  return {
    caption: "General post type. Stay in niche. Do not invent specifics.",
    image: "High-quality niche visual. No invented products/packaging.",
  };
}

/* ----------------- Priority System (THIS is the fix) ----------------- */

function buildPriorityRules(params: {
  niche: string;
  postType: string;
  specific: string;
  styleSpec: StyleSpec;
  hasRefImage: boolean;
  primaryColor: string;
  secondaryColor: string;
  tone: string;
  audience: string;
}) {
  const {
    niche,
    postType,
    specific,
    styleSpec,
    hasRefImage,
    primaryColor,
    secondaryColor,
    tone,
    audience,
  } = params;

  // You said:
  // TOP priority: niche, post type (+ unlocked textbox), image style
  // Lower priority: brand colors, tone, audience, reference image
  //
  // We encode that explicitly for BOTH prompts.

  const brandUsage =
    styleSpec.brandingStrength === "none"
      ? "Brand colors should NOT be forced."
      : styleSpec.brandingStrength === "light"
        ? "Brand colors are allowed as tiny accents only (subtle)."
        : "Brand colors should be strong and obvious in the design elements.";

  const colorGuidance =
    primaryColor || secondaryColor
      ? [
          brandUsage,
          primaryColor ? `Primary brand color: ${primaryColor}.` : "",
          secondaryColor ? `Secondary brand color: ${secondaryColor}.` : "",
          styleSpec.brandingStrength === "heavy"
            ? "Use neutrals only beyond the brand colors."
            : "Do not let colors overpower the lifestyle realism.",
        ]
          .filter(Boolean)
          .join(" ")
      : "No brand colors provided; keep it clean and premium.";

  const productRule = styleSpec.banProducts
    ? hasRefImage
      ? "Reference image exists: you may preserve its vibe, but still avoid readable labels/logos."
      : "CRITICAL: Do NOT invent products/packaging (no bags, bottles, boxes, labels). Represent the niche using people, environment, or service/action scenes."
    : "Avoid inventing product packaging unless user provided a reference image.";

  const textRule = styleSpec.allowText
    ? "Text is ALLOWED in the image. Keep it short, high-contrast, clean typography. No logos. Avoid brand names."
    : "CRITICAL: NO readable text in the image. Do not render words/letters/numbers.";

  const styleMustDifferentiate = `
CRITICAL DIFFERENTIATOR (do not ignore):
- ImageStyle="${styleSpec.photoRequired ? "photo-based" : "no-photo graphic"}"
- BrandingStrength="${styleSpec.brandingStrength}"
- TextInImage="${styleSpec.allowText ? "allowed" : "not allowed"}"
You MUST produce outputs that clearly look different across styles.
`;

  const topicLock = specific
    ? `SpecificRequest provided: "${specific}". You MUST follow it and not replace it with something else.`
    : `SpecificRequest is blank. You MUST NOT invent concrete offers, dates, discounts, or claims. Keep it generic within the post type.`;

  const coreLock = `
TOP PRIORITIES (must win over everything):
1) Niche: "${niche}"
2) PostType: "${postType}"
3) ImageStyle rules above
4) SpecificRequest (if present)

LOWER PRIORITY (do not let these override top priorities):
- Brand colors
- Tone
- Audience
- Reference image
`;

  const softContext = `
Lower-priority context:
Tone="${tone}"
Audience="${audience}"
`;

  return {
    coreLock,
    topicLock,
    styleMustDifferentiate,
    colorGuidance,
    productRule,
    textRule,
    softContext,
  };
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

    const niche = body.niche?.trim() || "business";
    const audience = body.audience?.trim() || "customers";
    const tone = body.tone?.trim() || "Confident";

    // Page.tsx uses `goal` as post type label
    const postType = body.goal?.trim() || "Basic post";
    const specific = String(body.specificRequest || "").trim();

    const maxCaptionChars = captionMax(body.captionLength);
    const hashtagCount = clampInt(Number(body.hashtagCount ?? 12), 0, 30);

    const primaryColor = normalizeHex(body.primaryColor);
    const secondaryColor = normalizeHex(body.secondaryColor);

    const callToAction =
      String(body.callToAction || "").trim() ||
      "Comment, Share, Like, Follow, DM us";

    const dayContext = body.dayContext
      ? `Calendar context: Day ${body.dayContext.day}. Title: ${body.dayContext.title}. Detail: ${body.dayContext.detail}.`
      : "";

    const refinement = String(body.refinementText || "").trim();

    const hasRefImage =
      !!body.referenceImageDataUrl &&
      body.referenceImageDataUrl.startsWith("data:image/");

    const styleSpec = getStyleSpec(body.imageStyle);
    const postTypeGuide = postTypeToGuidance(postType);

    const priority = buildPriorityRules({
      niche,
      postType,
      specific,
      styleSpec,
      hasRefImage,
      primaryColor,
      secondaryColor,
      tone,
      audience,
    });

    /* ---------------- Text generation (caption + hashtags + image scene) ---------------- */
    // IMPORTANT FIX: We generate a SCENE PLAN that respects style rules (no packaging, no text, etc).
    // The scene plan is intentionally "visual-only" and style-compliant so it doesn't poison the image prompt.

    const textInstructions = `
You generate a high-quality social post package.

Hard rules:
- Return ONLY valid JSON. No markdown. No extra keys.
- No emojis.
- Caption MUST be <= ${maxCaptionChars} characters.
- Caption must NOT describe the image ("in the photo", "picture this", etc).
- Caption MUST match the post type and tone.
- Caption MUST end with the call-to-action exactly: "${callToAction}" (case-sensitive).
- If SpecificRequest is provided, caption MUST include it clearly and directly (do not change the offer wording).
- If SpecificRequest is blank, do NOT invent discounts, dates, guarantees, or factual claims.
- Hashtags must be ONE line of space-separated hashtags, exactly ${hashtagCount} hashtags (0 allowed if hashtagCount is 0).

- The field "scene_plan" must be visual-only instructions and MUST obey the ImageStyle rules:
  - ${styleSpec.allowText ? "Text in image is allowed." : "NO text in image."}
  - ${styleSpec.banProducts ? "NO products/packaging." : "Avoid product packaging unless user provided a reference."}
  - Photo required: ${styleSpec.photoRequired ? "YES" : "NO"}
  - Branding strength: ${styleSpec.brandingStrength.toUpperCase()}
`;

    const textInput = `
${priority.coreLock}
${priority.styleMustDifferentiate}
${priority.topicLock}
${priority.productRule}
${priority.textRule}

PostType guidance:
- Caption intent: ${postTypeGuide.caption}
- Image intent: ${postTypeGuide.image}

Brand color guidance (LOW priority):
${priority.colorGuidance}

${dayContext ? dayContext : ""}

Return JSON:
{
  "caption": string,
  "hashtags": string,
  "scene_plan": string
}

Context:
Niche="${niche}"
PostType="${postType}"
SpecificRequest="${specific || "BLANK"}"
${priority.softContext}

Rules for scene_plan:
- It must be specific enough to render a strong image.
- It must NOT contain any readable text unless ImageStyle allows text.
- It must NOT contain product packaging or labels (unless reference image exists AND style allows).
- If unsure, choose a generic lifestyle/service/action scene that represents the niche.
`;

    const textResp = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: textInstructions,
      input: textInput,
      temperature: 0.45,
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
    let scenePlan = String(parsed.scene_plan || "").trim();

    if (caption.length > maxCaptionChars)
      caption = caption.slice(0, maxCaptionChars).trim();

    if (!caption.endsWith(callToAction)) {
      caption = `${caption.replace(/\s+$/g, "")} ${callToAction}`.trim();
      if (caption.length > maxCaptionChars) {
        const keep = ` ${callToAction}`;
        caption =
          caption.slice(0, Math.max(0, maxCaptionChars - keep.length)).trim() +
          keep;
      }
    }

    if (hashtagCount === 0) {
      hashtags = "";
    } else {
      hashtags = hashtags.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    }

    if (!caption) {
      return jsonError("Model returned empty caption.", {
        raw: raw.slice(0, 1200),
      });
    }

    // Final safety clamp: if style bans products and no ref image, scrub obvious packaging keywords
    if (styleSpec.banProducts && !hasRefImage && scenePlan) {
      scenePlan = scenePlan.replace(
        /\b(bag|bags|packaging|package|box|bottle|label|labels|wrapper|pouch|container)\b/gi,
        "scene"
      );
    }

    /* ---------------- Image instruction (STYLE ENFORCED AGAIN) ---------------- */
    // IMPORTANT FIX: We do NOT let "brand colors dominate" if the style is lifestyle/light branding.
    // Also: we only include text-related instructions if allowText is true.

    const allowTextRule = styleSpec.allowText
      ? "Text is allowed. Add a short headline + small subhead, clean modern font, high contrast, readable. No logos. Avoid brand names."
      : "CRITICAL: Do NOT render any readable text (no words/letters/numbers).";

    const brandingRule =
      styleSpec.brandingStrength === "none"
        ? "Do not add any branding shapes/frames."
        : styleSpec.brandingStrength === "light"
          ? "Use brand colors ONLY as tiny subtle accents (very minimal)."
          : "Use brand colors heavily via shapes/frames/blocks/overlays; premium design.";

    const brandColorsRule =
      primaryColor || secondaryColor
        ? [
            brandingRule,
            primaryColor ? `Primary color: ${primaryColor}.` : "",
            secondaryColor ? `Secondary color: ${secondaryColor}.` : "",
            styleSpec.brandingStrength === "heavy"
              ? "Keep other colors neutral."
              : "Do not let colors overpower the realism.",
          ]
            .filter(Boolean)
            .join(" ")
        : brandingRule;

    const productBanRule = styleSpec.banProducts
      ? hasRefImage
        ? "Reference image provided: preserve vibe, but avoid readable labels/logos."
        : "CRITICAL: Do NOT generate product packaging, labels, branded items, bags, bottles, boxes."
      : "";

    const photoRequirementRule = styleSpec.photoRequired
      ? "CRITICAL: This must look like a REALISTIC PHOTO (not illustration) unless the style explicitly says no photo."
      : "CRITICAL: This must be graphic design only (no photo, no photorealism).";

    let imageInstruction = [
      priority.coreLock,
      priority.styleMustDifferentiate,
      priority.topicLock,

      "IMAGE STYLE SPEC (must follow):",
      styleSpec.basePrompt,
      styleSpec.layoutHint,

      photoRequirementRule,
      allowTextRule,
      productBanRule,
      brandColorsRule,

      "POST TYPE IMAGE INTENT:",
      postTypeGuide.image,

      "SCENE PLAN (style-compliant):",
      scenePlan || "",

      specific
        ? `SpecificRequest (visual interpretation, do not invent products): ${specific}`
        : "",

      refinement ? `Apply ONLY this change: ${refinement}` : "",

      "Quality: premium, Instagram-ready, high-end commercial look.",
      "No logos. Avoid brand names. No watermarks.",
    ]
      .filter(Boolean)
      .join("\n");

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
      if (hasRefImage) {
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

        if (hasRefImage) {
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
