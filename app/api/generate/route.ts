// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import {
  getTokenKey,
  getDefaultTokenData,
  resetTokensIfNewMonth,
  decrementToken,
  canUseToken,
  type TokenData,
} from "../../lib/tokens";

export const runtime = "nodejs";

/* ----------------------------- Types ----------------------------- */

type DayContext = {
  day: string;
  title: string;
  detail: string;
};

type GeneratedResult = {
  caption: string;
  hashtags: string;
  imageBase64: string;
  imagePrompt?: string;
  why?: string;
  createdAt: number;
};

// In-memory cache for idempotency (replace with DB in production)
const generationCache = new Map<string, GeneratedResult>();

type Body = {
  requestId?: string;
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

function applyRefinementAnchor(
  basePrompt: string,
  refinement?: string
): string {
  if (!refinement || !refinement.trim()) {
    return basePrompt;
  }

  const anchorBlock = `
REFINEMENT ANCHORING:
Preserve: same subject, identity, pose, framing, camera angle, lighting, background, overall composition.
Do NOT introduce new objects or change setting unless explicitly requested.
Do NOT replace the person/subject or create brand-new scenes unless user explicitly asks to "replace" or wants "new background".
For vague requests ("make it better", "more professional", "change style"), keep the SAME subject and scene.
Apply ONLY the requested changes.
Keep everything else the same.

Requested changes: ${refinement.trim()}`;

  return basePrompt + "\n" + anchorBlock;
}

function jsonError(message: string, details?: any, status = 500) {
  return NextResponse.json({ error: true, message, details }, { status });
}

function logUsage(description: string, usage?: any, extraInfo?: any) {
  const timestamp = new Date().toISOString();
  console.log(`[USAGE] ${timestamp} - ${description}`, {
    prompt_tokens: usage?.prompt_tokens || "unknown",
    completion_tokens: usage?.completion_tokens || "unknown",
    total_tokens: usage?.total_tokens || "unknown",
    ...extraInfo,
  });
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

  logUsage("Safety Rewrite", resp.usage, {
    model: "gpt-4.1-mini",
    original_prompt_chars: originalPrompt.length,
  });

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

  // 1) Natural Lifestyle — NO text, NO products, very light branding
  if (
    style === "lifestyle" ||
    style === "lifestyle_min_brand" ||
    style === "lifestyle_photo"
  ) {
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

  // 2) Branded Photo — Clean photo with graphic design frame/accents AROUND it
  if (
    style === "branded_photo" ||
    style === "branding_photo_no_text" ||
    style === "branding_photo"
  ) {
    return {
      allowText: false,
      photoRequired: true,
      brandingStrength: "light",
      banProducts: true,
      basePrompt: `
CLEAN, REALISTIC photo as the main subject — DO NOT alter or stylize the photo itself.
The photo should look natural and untouched.
Add graphic design elements AROUND or ON TOP of the photo edges:
  - Bold colored frames or borders in brand colors
  - Geometric shapes (circles, lines, corners) as decorative accents
  - Color blocks or panels beside or behind the photo
  - Subtle overlays at corners or edges only
KEEP the photo center clean and unaltered.
NO readable text. NO logos. NO packaging. NO labels.
Modern Instagram feed aesthetic with designed frame/accents.
`,
      layoutHint: `
Think of a photo inside a designed frame or template.
Graphic elements should frame or accent the photo, not be embedded in it.
Leave the main photo area clean and realistic.
`,
    };
  }

  // 3) Branded + Text + Photo — HEAVY graphic design elements with text
  if (style === "branded_text_photo" || style === "branding_text_photo") {
    return {
      allowText: true,
      photoRequired: true,
      brandingStrength: "heavy",
      banProducts: true,
      basePrompt: `
REALISTIC photo as the base layer with HEAVY graphic design treatment.
CRITICAL: This style requires MAXIMUM graphic design elements:
- Bold frames, shapes, borders, and geometric overlays in brand colors
- Gradients, color blocks, and design accents throughout
- The design should look like a professional social media template
Brand colors MUST dominate the visual design.
Typography is EXPECTED: clean, modern, high-contrast headline text.
The photo is a backdrop; the graphic design and text are the stars.
NO logos. Avoid brand names. Avoid packaging and labels.
`,
      layoutHint: `
Think premium Instagram template with bold design elements.
Use geometric shapes, frames, and overlays extensively.
Headline + subhead style layout with strong visual hierarchy.
Brand colors should be impossible to miss.
`,
    };
  }

  // 4) Graphic Design (text only) — no photo
  if (style === "branded_text_only" || style === "branding_text_only") {
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
CRITICAL: Must have solid or gradient background using brand colors.
NO transparent background. NO alpha channel. NO cutout subject on blank canvas.
Full-bleed background edge-to-edge, no borders.
High contrast text over background.
`,
      layoutHint: `
Use a strong grid, spacing, and typographic hierarchy.
Add subtle pattern texture / dots / lines for depth.
Background must be solid colored or subtle gradient - never transparent.
`,
    };
  }

  // Default fallback: treat like lifestyle (safe)
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
        "Educational content. If specificRequest is provided, use it as the core fact/tip and build the caption around it - this is verified info from the user. If blank: Create engaging content using UNIVERSAL TRUTHS about the niche (things always true), PROCESS insights (how things work), or RELATABLE observations. DO NOT invent specific statistics, company-specific claims, or facts that could be wrong for this particular business. Keep it interesting but grounded in general wisdom.",
      image:
        "Helpful, clean visual consistent with niche; avoid products/packaging unless a reference image is provided.",
    };
  }

  if (t.includes("problem") && t.includes("solution")) {
    return {
      caption:
        "Problem → solution. If specificRequest is provided, use that exact problem/solution - this is verified from the user. If blank: Focus on COMMON, RELATABLE pain points the audience would recognize. Keep solution general to what the niche offers. DO NOT invent specific percentages, timeframes, or guaranteed outcomes unless user provided them.",
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
        "Authority/credibility. If specificRequest is provided (credentials, years, certifications), use it confidently - this is verified info from the user. If blank: Demonstrate expertise through PERSPECTIVE (how a professional thinks), GENERAL PRINCIPLES (best practices), or EXPERIENCE-BASED WISDOM. DO NOT invent specific years, certifications, awards, or company-specific claims. Keep it authoritative but general.",
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

/* ----------------- Caption Structure (Hooks + CTAs) ----------------- */

type CaptionStructure = {
  hookStyle: string;
  hookExamples: string[];
  ctaOptions: string[];
  structureHint: string;
};

function getCaptionStructure(postType?: string): CaptionStructure {
  const t = String(postType || "").toLowerCase();

  if (t.includes("basic")) {
    return {
      hookStyle: "Observation or relatable statement",
      hookExamples: [
        "Here's what we love about...",
        "Nothing beats...",
        "This is why we do what we do.",
      ],
      ctaOptions: [
        "Follow for more",
        "Double tap if you agree",
        "Save this for later",
      ],
      structureHint:
        "Start with a relatable observation, share a simple thought, end with CTA.",
    };
  }

  if (t.includes("promotion") || t.includes("offer")) {
    return {
      hookStyle: "Urgency or value-driven opener",
      hookExamples: [
        "For a limited time...",
        "Don't miss this.",
        "Here's your chance to...",
      ],
      ctaOptions: [
        "Grab yours today",
        "DM us to claim",
        "Link in bio",
        "Shop now",
      ],
      structureHint:
        "Lead with urgency or value, state the offer clearly, end with action CTA.",
    };
  }

  if (t.includes("educational") || t.includes("tips")) {
    return {
      hookStyle: "Question or curiosity opener",
      hookExamples: [
        "Ever wondered why...?",
        "Here's a tip most people miss.",
        "Did you know...?",
      ],
      ctaOptions: [
        "Save this for later",
        "Share with someone who needs this",
        "Bookmark this",
      ],
      structureHint:
        "Open with curiosity, deliver the tip/insight, end with save/share CTA.",
    };
  }

  if (t.includes("problem") && t.includes("solution")) {
    return {
      hookStyle: "Pain point callout",
      hookExamples: [
        "Tired of...?",
        "Struggling with...?",
        "If you've ever dealt with...",
      ],
      ctaOptions: [
        "DM us to learn more",
        "Let us help — link in bio",
        "Comment if this sounds familiar",
      ],
      structureHint:
        "Call out the problem, present the solution, invite them to reach out.",
    };
  }

  if (t.includes("before") && t.includes("after")) {
    return {
      hookStyle: "Transformation tease",
      hookExamples: [
        "The difference is unreal.",
        "See what changed.",
        "From this to this.",
      ],
      ctaOptions: [
        "Ready for your transformation? DM us",
        "Want results like this? Link in bio",
        "Your turn next",
      ],
      structureHint:
        "Tease the transformation, highlight the change, invite them to start their journey.",
    };
  }

  if (t.includes("testimonial") || t.includes("social proof")) {
    return {
      hookStyle: "Quote lead-in",
      hookExamples: [
        "Our client said it best:",
        "Real words from a real customer:",
        "Here's what they had to say:",
      ],
      ctaOptions: [
        "Share your experience below",
        "Want similar results? DM us",
        "Your story could be next",
      ],
      structureHint:
        "Introduce the testimonial, share the quote, invite others to share or inquire.",
    };
  }

  if (t.includes("behind")) {
    return {
      hookStyle: "Curiosity opener",
      hookExamples: [
        "Here's what happens behind the scenes.",
        "A look at how we do it.",
        "Ever wonder what goes into...?",
      ],
      ctaOptions: [
        "Follow for more behind the scenes",
        "Comment what you want to see next",
        "Like if you enjoyed this peek",
      ],
      structureHint:
        "Open with curiosity, share the behind-the-scenes moment, invite engagement.",
    };
  }

  if (t.includes("announcement") || t.includes("update")) {
    return {
      hookStyle: "News hook",
      hookExamples: [
        "Big news!",
        "We've got something exciting to share.",
        "It's finally here.",
      ],
      ctaOptions: [
        "Stay tuned",
        "Follow for updates",
        "Turn on notifications",
        "Link in bio for details",
      ],
      structureHint:
        "Lead with excitement, share the news clearly, direct them to stay connected.",
    };
  }

  if (t.includes("engagement") || t.includes("conversation")) {
    return {
      hookStyle: "Direct question",
      hookExamples: [
        "What's your take on...?",
        "We want to know:",
        "Quick question for you:",
      ],
      ctaOptions: [
        "Drop your answer below",
        "Comment your thoughts",
        "Tag a friend who...",
      ],
      structureHint:
        "Ask a compelling question, add context if needed, invite them to respond.",
    };
  }

  if (t.includes("seasonal") || t.includes("timely")) {
    return {
      hookStyle: "Time reference",
      hookExamples: [
        "This season...",
        "'Tis the season for...",
        "With [event] around the corner...",
      ],
      ctaOptions: [
        "Book now before it's too late",
        "DM us today",
        "Don't wait — link in bio",
      ],
      structureHint:
        "Reference the season/event, tie it to your offering, create urgency to act.",
    };
  }

  if (t.includes("authority") || t.includes("credibility")) {
    return {
      hookStyle: "Expertise signal",
      hookExamples: [
        "After years in this industry...",
        "Here's what we've learned:",
        "One thing most people get wrong:",
      ],
      ctaOptions: [
        "Follow for expert tips",
        "Questions? Drop them below",
        "DM for advice",
      ],
      structureHint:
        "Establish credibility, share an insight, invite them to learn more.",
    };
  }

  if (
    t.includes("service") ||
    t.includes("product") ||
    t.includes("highlight")
  ) {
    return {
      hookStyle: "Feature or benefit highlight",
      hookExamples: [
        "Here's what makes this special.",
        "Why our clients love this:",
        "The difference is in the details.",
      ],
      ctaOptions: [
        "Learn more — link in bio",
        "DM us for details",
        "Book a consultation today",
      ],
      structureHint:
        "Highlight a key feature/benefit, explain the value, invite inquiry.",
    };
  }

  if (t.includes("custom")) {
    return {
      hookStyle: "Flexible — match the user's specific request",
      hookExamples: ["Adapt to what the user describes"],
      ctaOptions: ["Choose based on the content goal"],
      structureHint:
        "Follow the user's specific request for both hook and CTA style.",
    };
  }

  // Default fallback
  return {
    hookStyle: "Engaging opener",
    hookExamples: ["Here's something worth knowing.", "Let's talk about..."],
    ctaOptions: ["Follow for more", "Comment below", "Share if you agree"],
    structureHint: "Open strong, deliver value, end with engagement CTA.",
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
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Body;

    // Check and decrement tokens (skip for refinements)
    if (!body.refinementText) {
      const tokenKey = getTokenKey(userId);

      // Get current token data (this would be from a database in production)
      let tokenData: TokenData;
      try {
        // For now, use a simple in-memory fallback
        // In production, this would fetch from a database
        tokenData = getDefaultTokenData();
      } catch {
        tokenData = getDefaultTokenData();
      }

      // Reset tokens if new month
      tokenData = resetTokensIfNewMonth(tokenData);

      // Check if user has tokens
      if (!canUseToken(tokenData)) {
        return NextResponse.json(
          {
            error:
              "No tokens remaining. You have used all 60 tokens for this month.",
          },
          { status: 402 }
        );
      }

      // Decrement token (we'll save this back to database in production)
      tokenData = decrementToken(tokenData);

      console.log(
        `Token used for user ${userId}. Remaining: ${tokenData.totalMonthlyTokens - tokenData.tokensUsedThisMonth}`
      );
    }

    // Check for existing generation with same requestId
    if (body.requestId && !body.refinementText) {
      const cached = generationCache.get(body.requestId);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

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

    // CTA will be set dynamically after we get captionStructure

    const dayContext = body.dayContext
      ? `Calendar context: Day ${body.dayContext.day}. Title: ${body.dayContext.title}. Detail: ${body.dayContext.detail}.`
      : "";

    const refinement = String(body.refinementText || "").trim();

    const hasRefImage =
      !!body.referenceImageDataUrl &&
      body.referenceImageDataUrl.startsWith("data:image/");

    const styleSpec = getStyleSpec(body.imageStyle);
    const postTypeGuide = postTypeToGuidance(postType);
    const captionStructure = getCaptionStructure(postType);

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
- If SpecificRequest is provided, caption MUST include it clearly and directly (do not change the offer wording).
- If SpecificRequest is blank, do NOT invent discounts, dates, guarantees, or factual claims.
- FACTUAL SAFETY: If SpecificRequest contains facts/claims, use them confidently (user verified). If SpecificRequest is blank, DO NOT invent business-specific claims (years in business, certifications, specific outcomes, data analytics capabilities, etc.). Instead use universal truths and relatable observations about the niche. Be interesting and engaging, but grounded.
- Hashtags must be ONE line of space-separated hashtags, exactly ${hashtagCount} hashtags (0 allowed if hashtagCount is 0).

CAPTION STRUCTURE (CRITICAL):
1. HOOK: Start with an attention-grabbing opening line.
   - Hook style for this post type: ${captionStructure.hookStyle}
   - Example hooks: ${captionStructure.hookExamples.slice(0, 2).join(" / ")}
   - First 5-10 words MUST grab attention. No generic openers like "Hey there" or "Check this out".

2. BODY: ${captionStructure.structureHint}

3. CTA: End with a strong call-to-action.
   - Best CTAs for this post type: ${captionStructure.ctaOptions.join(", ")}
   - Pick ONE that fits naturally. Make it feel organic, not forced.
   - The CTA should match the post's intent (don't use "Save this" for a promo post).

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

    logUsage("Text Generation (caption/hashtags/scene)", textResp.usage, {
      model: "gpt-4.1-mini",
      instructions_chars: textInstructions.length,
      input_chars: textInput.length,
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

    // CTA is now generated dynamically by the AI based on post type
    // No forced CTA appending - the AI picks the best contextual CTA

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

      "Quality: premium, Instagram-ready, high-end commercial look.",
      "No logos. Avoid brand names. No watermarks.",
    ]
      .filter(Boolean)
      .join("\n");

    // Apply refinement anchoring if refinement exists
    imageInstruction = applyRefinementAnchor(imageInstruction, refinement);

    /* ---------------- Image generation/edit ---------------- */

    async function doGenerate(prompt: string) {
      const img = await client.images.generate({
        model: "gpt-image-1",
        prompt,
        size: "1024x1024",
      });

      logUsage("Image Generation", null, {
        model: "gpt-image-1",
        size: "1024x1024",
        prompt_chars: prompt.length,
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

      logUsage("Image Edit", null, {
        model: "gpt-image-1",
        size: "1024x1024",
        prompt_chars: prompt.length,
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

    const result = {
      caption,
      hashtags,
      why: "",
      imageBase64: `data:image/png;base64,${b64}`,
      imagePrompt: imageInstruction,
      createdAt: Date.now(),
    };

    // Cache the result for future requests with same requestId
    if (body.requestId && !body.refinementText) {
      generationCache.set(body.requestId, result);
      // Clean up old entries (keep only last 100)
      if (generationCache.size > 100) {
        const entries = Array.from(generationCache.entries());
        const oldEntries = entries
          .sort((a, b) => a[1].createdAt - b[1].createdAt)
          .slice(0, entries.length - 100);
        oldEntries.forEach(([key]) => generationCache.delete(key));
      }
    }

    return NextResponse.json({
      result,
    });
  } catch (err: any) {
    console.error("❌ /api/generate crashed:", err);
    return jsonError(err?.message || "Server error", err?.stack || String(err));
  }
}

// TOKEN COST ANALYSIS FOR SINGLE GENERATION:
//
// Typical API Calls per Generation:
// 1. Text Generation (gpt-4.1-mini): ~2,000 prompt + 500 completion tokens
// 2. Image Generation (gpt-image-1): 1x 1024x1024 image
// 3. Safety Rewrite (gpt-4.1-mini): ~1,500 prompt + 300 completion tokens (only if rejected)
//
// Total per generation: ~2,500 tokens + 1 image (typical case)
