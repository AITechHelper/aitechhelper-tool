// app/api/generate/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { getTokenStatus, useToken, type TokenStatus } from "../../lib/tokens";
import { getTemplate, buildPillarPromptEnrichment, getRandomPillarScene, nicheKeyFromLabel, type ContentPillar } from "../../lib/nicheTemplates";

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

  // Niche template pillar (e.g., "market_authority") — drives prompt enrichment
  pillarType?: string;

  // Optional personal thought to weave naturally into the caption body
  userThought?: string;

  // Optional image scene description from the user to guide scene_plan generation
  imageDescription?: string;
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
  if (len === "Short") return 160;
  if (len === "Long") return 360;
  return 240;
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
  naturalPhotoColors?: boolean; // brand colors go ONLY in design overlays — never in photo scene/people/clothing
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

  // 1b) Natural Lifestyle + Text — lifestyle photo, text added via Canvas
  if (style === "lifestyle_photo_text") {
    return {
      allowText: false,
      photoRequired: true,
      brandingStrength: "light",
      banProducts: true,
      basePrompt: `
REALISTIC lifestyle photography. Clean background layer only — NO text anywhere.
Authentic candid moment or environment scene.
Fits the niche through context (setting / activity), NOT products.
Natural lighting, shallow depth of field, high-end commercial photo.
Looks organic and unposed (not stock-photo cheesy).
CRITICAL: NO text, NO words, NO letters anywhere in the image.
Lower portion of the photo should be naturally darker or open so text can be overlaid on top.
NO logos. NO packaging. NO brand names.
`,
      layoutHint: `
Lifestyle framing. No text at all. Clean photo only.
Subjects in upper 55-60% of frame. Lower area darker/quieter for text placement.
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

  // 3) Branded + Text + Photo — AI does graphic design, Canvas adds text
  if (style === "branded_text_photo" || style === "branding_text_photo") {
    return {
      allowText: false,
      photoRequired: true,
      brandingStrength: "heavy",
      banProducts: true,
      naturalPhotoColors: true,
      basePrompt: `
REALISTIC photo as the full-bleed background with professional graphic design treatment layered on top.
CRITICAL: NO text, NO words, NO letters anywhere in the image. Text will be added separately.
TEXT ZONE RULE: The bottom 40% of the image must have a clear readable surface (semi-transparent brand-color overlay, dark gradient, or solid brand-color panel) — this zone is reserved for text that will be added on top. Keep this zone clean and uncluttered.

GRAPHIC DESIGN: Choose ONE of these varied treatments for the TOP 60% and edges:
A) Thin primary-color inset border around the entire image + bold accent bar along the top edge + small corner bracket marks in top-right
B) Thin primary-color inset border + thick left-side stripe in primary color (top half only) + subtle diagonal accent mark top-right corner
C) Thin primary-color inset border + two short horizontal rule lines in top-left corner + bottom-right corner accent mark
D) Thin primary-color inset border + top-left corner bracket + bottom-right corner bracket, both in primary color

All design elements go in the TOP portion or edges ONLY — never in the bottom text zone.
Professional, premium, modern. NOT playful or busy. Think agency-quality ad.
NO logos. Avoid brand names.
`,
      layoutHint: `
Full-bleed photo. Bottom 40%: clear overlay/panel for Canvas text placement.
Top 60% + edges: one of the graphic element variants above.
Thin primary-color inset border always present.
Vary the graphic element treatment each generation.
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

  if (t.includes("everyday")) {
    return {
      caption:
        "General brand presence post. No specific hook required — write something relatable, human, and on-brand for the niche. Make it feel real and lived-in, not corporate. Do not invent specifics.",
      image:
        "Authentic niche lifestyle scene. High quality, candid energy. Do not invent products or packaging.",
    };
  }

  if (t.includes("promotion") || t.includes("offer")) {
    return {
      caption:
        "Promotion/offer post. If specificRequest is provided, include it exactly — do not soften or change the offer wording. If blank, do NOT invent a discount or date; write bold promotional energy that makes them want to act without a specific deal.",
      image:
        "Promotional energy without inventing product packaging. Show service-in-action or lifestyle cues that feel exciting and urgent.",
    };
  }

  if (t.includes("educational tip") || t.includes("educational")) {
    return {
      caption:
        "Educational tip post. If specificRequest is provided, use it as the core fact/tip — this is verified info from the user, so use it confidently and build around it. If blank: draw from UNIVERSAL TRUTHS about the niche (things that are always true), PRO-LEVEL INSIGHTS (things a real expert would know), or SURPRISING OBSERVATIONS that reframe how the audience sees the topic. Make it genuinely useful and interesting — not watered-down. Do NOT invent specific statistics or company-specific claims.",
      image:
        "Clean, concept-driven visual that reinforces the educational theme. Avoid products/packaging.",
    };
  }

  if (t.includes("hot take")) {
    return {
      caption:
        "Hot take / bold opinion post. Write a strong, opinionated take on the niche that challenges conventional wisdom or says what most people in the industry won't say out loud. This is thought leadership — be direct, confident, and a little provocative. If specificRequest has a take, amplify it. If blank, craft a genuinely bold industry opinion that will stop the scroll. Do NOT hedge, do NOT be lukewarm.",
      image:
        "Bold, high-contrast visual that matches the energy of a strong opinion — dynamic lighting, strong composition, dramatic niche scene. No packaging.",
    };
  }

  if (t.includes("myth buster") || t.includes("myth")) {
    return {
      caption:
        "Myth buster post. Structure: state the myth clearly, then debunk it with confidence. If specificRequest names the myth, use it directly. If blank, choose a common misconception in the niche that the audience would recognize. Be authoritative — you're the one setting the record straight. The hook should name the myth so readers immediately recognize it.",
      image:
        "Bold graphic or conceptual scene that visually represents busting a misconception — contrast imagery, bold framing, strong composition. No packaging.",
    };
  }

  if (t.includes("problem") && t.includes("solution")) {
    return {
      caption:
        "Problem/solution post. Open by naming the pain point in a way that makes the target audience say 'that's me.' If specificRequest describes the problem/solution, use it directly — this is verified from the user. If blank: focus on the most common, most frustrating pain point for this niche's audience and position the business as the clear answer. Do NOT invent specific percentages or guaranteed outcomes unless user provided them.",
      image:
        "Visual hinting at the problem/solution concept — before energy on one side, resolution on the other, or a clean conceptual scene. No products.",
    };
  }

  if (t.includes("announcement")) {
    return {
      caption:
        "Announcement post. If specificRequest has the news, lead with it — make it feel like a moment. If blank, write a bold anticipation-building announcement that gets people excited to follow along. Use exclamation and energy appropriately — this should feel like real news, not a press release.",
      image:
        "Bold branded announcement visual — clean, energetic, on-brand. The announcement lives in the caption; the image should have big energy.",
    };
  }

  if (t.includes("engagement question") || t.includes("engagement")) {
    return {
      caption:
        "Engagement question post. Ask a question so relevant and interesting that the audience can't help but respond. If specificRequest has a question, use it. If blank, craft a question that's niche-specific, a little unexpected, and genuinely sparks debate or curiosity. Avoid generic questions like 'What do you think?' — make it specific and juicy.",
      image:
        "Friendly, warm niche visual or branded layout. Energy should feel inviting and conversational.",
    };
  }

  if (t.includes("seasonal") || t.includes("timely")) {
    return {
      caption:
        "Seasonal/timely post. If specificRequest names the season/event, tie the niche directly to it in a creative, specific way — not just 'happy holidays.' If blank, choose a universally timely angle. Make it feel current and relevant, not just a calendar obligation.",
      image:
        "Themed visual matching the season or moment — warm, atmospheric, conceptual. AI generates a fitting scene without needing real photos.",
    };
  }

  if (t.includes("custom")) {
    return {
      caption:
        "Custom post. Follow specificRequest as the primary instruction — treat it as the user's direct creative brief. If blank, create an engaging general post for the niche.",
      image:
        "Follow specificRequest visually. Stay safe and avoid brands/logos unless style requires generic text.",
    };
  }

  return {
    caption:
      "General brand post. Stay in niche, be engaging, do not invent specifics.",
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

  if (t.includes("everyday")) {
    return {
      hookStyle: "Relatable, specific observation — NOT generic",
      hookExamples: [
        "The thing nobody tells you about [niche]...",
        "Real talk:",
        "This is what [niche] actually looks like.",
      ],
      ctaOptions: [
        "Follow for more",
        "Drop a comment if you relate",
        "Save this for later",
        "Tag someone who needs to see this",
      ],
      structureHint:
        "Open with something real and specific that hooks the right audience, share a genuine thought or moment, end with a light CTA that feels natural.",
    };
  }

  if (t.includes("promotion") || t.includes("offer")) {
    return {
      hookStyle: "Punchy urgency or bold value statement — make them feel like they'd be missing out",
      hookExamples: [
        "This deal doesn't last long.",
        "You asked. We delivered.",
        "This is the one you've been waiting for.",
      ],
      ctaOptions: [
        "Grab it before it's gone — link in bio",
        "DM us NOW to lock this in",
        "Don't sleep on this",
        "Book your spot today",
      ],
      structureHint:
        "Lead hard with the value or offer, make the benefit crystal clear, inject urgency, end with a direct call-to-action that drives immediate response.",
    };
  }

  if (t.includes("educational tip") || t.includes("educational")) {
    return {
      hookStyle: "Curiosity-gap or surprising insight opener — make them feel like they're about to learn something they didn't know",
      hookExamples: [
        "Most people get this completely wrong.",
        "Here's what they don't teach you about [niche].",
        "The #1 mistake people make with [niche]:",
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

  if (t.includes("hot take")) {
    return {
      hookStyle: "Controversial or bold statement that demands a reaction",
      hookExamples: [
        "Unpopular opinion:",
        "Nobody in [niche] wants to admit this.",
        "I'll say what everyone else is afraid to say:",
      ],
      ctaOptions: [
        "Agree or disagree? Drop it below",
        "Repost if you agree",
        "Tag someone who needs to hear this",
      ],
      structureHint:
        "Lead with the bold take right in the first line — no soft-pedaling. State it clearly, back it up briefly, then invite the audience to react. The goal is a real response, not validation.",
    };
  }

  if (t.includes("myth buster") || t.includes("myth")) {
    return {
      hookStyle: "Call out the myth immediately in the first line",
      hookExamples: [
        "MYTH: [state the common belief]",
        "Everyone thinks [X]. Here's why that's wrong.",
        "Stop believing this about [niche]:",
      ],
      ctaOptions: [
        "Save this — your future self will thank you",
        "Share this with someone who needs it",
        "Follow for more real talk about [niche]",
      ],
      structureHint:
        "State the myth clearly so readers immediately recognize it. Debunk it with confidence and a brief, compelling reason. End with something that makes them want to save or share.",
    };
  }

  if (t.includes("problem") && t.includes("solution")) {
    return {
      hookStyle: "Visceral pain point callout — make them feel seen",
      hookExamples: [
        "If you're sick of dealing with [problem], you're not alone.",
        "Here's why [common struggle] keeps happening — and how to fix it.",
        "The real reason [problem] keeps coming back:",
      ],
      ctaOptions: [
        "DM us — we can help",
        "Ready to fix this for good? Link in bio",
        "Comment 'YES' if this sounds familiar",
      ],
      structureHint:
        "Name the pain point in a way that makes the right people immediately say 'that's me.' Build tension around it, then deliver the solution with confidence. The CTA should feel like relief, not a sales push.",
    };
  }

  if (t.includes("announcement")) {
    return {
      hookStyle: "Bold news drop — make it feel like a moment",
      hookExamples: [
        "It's happening.",
        "We've been working on something big.",
        "Big news:",
      ],
      ctaOptions: [
        "Follow so you don't miss it — link in bio",
        "Comment your questions below",
        "Turn on notifications — this is worth it",
      ],
      structureHint:
        "Open with the moment — make the audience feel like something real is happening. Share the news with energy and specificity. End by directing them to stay connected or take action.",
    };
  }

  if (t.includes("engagement question") || t.includes("engagement")) {
    return {
      hookStyle: "Niche-specific question that's too interesting to scroll past",
      hookExamples: [
        "Hot take: [controversial stance]. Agree or disagree?",
        "What's the one thing about [niche] that nobody ever talks about?",
        "Real question for my [niche] community:",
      ],
      ctaOptions: [
        "Drop your answer in the comments — I read every one",
        "Comment below",
        "Tag someone who'd have a strong opinion on this",
      ],
      structureHint:
        "Ask a question specific enough that it can't be answered with a shrug. Add one line of context or a spicy framing to make answering feel rewarding. The goal is to get real, personal responses in the comments.",
    };
  }

  if (t.includes("seasonal") || t.includes("timely")) {
    return {
      hookStyle: "Timely, specific angle — not just 'happy holidays'",
      hookExamples: [
        "This time of year is [specific feeling/challenge] for [niche] — here's how to handle it.",
        "[Season/Event] means something different when you're in [niche].",
        "While everyone else is [doing seasonal thing], here's what the pros are doing:",
      ],
      ctaOptions: [
        "Book now — spots are going fast",
        "DM us before [event] — we're almost full",
        "Don't wait until the rush — link in bio",
      ],
      structureHint:
        "Make the seasonal angle feel specific and relevant to the niche — not generic. Tie the timing to something real your audience experiences. Create urgency around the moment.",
    };
  }

  if (t.includes("custom")) {
    return {
      hookStyle: "Flexible — match the intent of the specific request",
      hookExamples: ["Adapt fully to what the user describes"],
      ctaOptions: ["Choose based on the content goal and post type"],
      structureHint:
        "Follow the user's specific request as the creative brief. Match the hook style and CTA to the intent described.",
    };
  }

  // Default fallback
  return {
    hookStyle: "Bold, specific opener — no generic filler",
    hookExamples: [
      "Here's something most people don't know about [niche].",
      "Let's talk about something real:",
    ],
    ctaOptions: [
      "Follow for more",
      "Comment your thoughts below",
      "Save this for later",
    ],
    structureHint:
      "Open with something worth stopping for. Deliver real value or a real point of view. End with a CTA that feels earned.",
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

    // Token status holder (populated below)
    let tokenStatus: TokenStatus | null = null;

    // Check tokens BEFORE generation (skip for refinements)
    if (!body.refinementText) {
      tokenStatus = await getTokenStatus(userId);
      if (tokenStatus.remaining <= 0) {
        return NextResponse.json(
          { error: "No tokens remaining" },
          { status: 403 }
        );
      }
    }

    // Check for existing generation with same requestId
    if (body.requestId && !body.refinementText) {
      const cached = generationCache.get(body.requestId);
      if (cached) {
        return NextResponse.json({
          result: cached,
          userId,
          tokenData: tokenStatus,
        });
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

    // Niche template pillar enrichment
    const pillarType = String(body.pillarType || "").trim();
    let pillarEnrichment = "";
    let activePillar: ContentPillar | null = null;
    if (pillarType) {
      const template = getTemplate(nicheKeyFromLabel(niche));
      const pillar = template.pillars[pillarType];
      if (pillar) {
        activePillar = pillar;
        pillarEnrichment = buildPillarPromptEnrichment(pillar);
      }
    }

    // Page.tsx uses `goal` as post type label
    const postType = body.goal?.trim() || "Basic post";
    const specific = String(body.specificRequest || "").trim();
    const userThought = String(body.userThought || "").trim();
    const imageDescription = String(body.imageDescription || "").trim();

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
- FACTUAL SAFETY: If SpecificRequest contains facts/claims, use them confidently (user verified). If SpecificRequest is blank, DO NOT invent business-specific claims (years in business, certifications, specific outcomes). Instead use universal truths, sharp observations, and relatable niche insights. Be bold and real — not safe and corporate.
- Hashtags must be ONE line of space-separated hashtags, exactly ${hashtagCount} hashtags (0 allowed if hashtagCount is 0).

CAPTION QUALITY MANDATE — READ THIS FIRST:
The caption must be genuinely engaging, not generic filler. Think of the best social media accounts in this niche — the ones people actually stop and read. Write like that.
- DO NOT write safe, watered-down, corporate-sounding copy.
- DO write with a real point of view, specific language, and something worth reading.
- The hook must be so good that someone scrolling at 1.5x speed still stops.
- Opinions, edge, specificity, and a clear voice beat vague positivity every time.
- If the post type calls for boldness (Hot Take, Myth Buster, Engagement Question), commit to it fully — no hedging.

CAPTION STRUCTURE (CRITICAL):
1. HOOK: Start with an attention-grabbing opening line.
   - Hook style for this post type: ${captionStructure.hookStyle}
   - Example hooks: ${captionStructure.hookExamples.slice(0, 2).join(" / ")}
   - First 5-10 words MUST stop the scroll. Ban ALL of these openers: "Hey there", "Check this out", "We're excited to share", "As a [niche] professional", "In today's world", "Are you looking for".

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
  "scene_plan": string,
  "image_headline": string
}

image_headline rules:
- Bold, punchy, statement-style. Written to display as large text overlaid on a photo.
- Length is flexible and message-driven: use 3–5 words when short and punchy lands best, use 6–12 words when the message genuinely needs more. Never pad for length, never cut meaning for brevity.
- NOT the same wording as the caption hook — this is a standalone visual statement.
- No hashtags, no emojis, no punctuation except one optional exclamation mark.
- Think billboard copy. Sometimes one line. Sometimes two. Whatever serves the message.

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
${pillarEnrichment ? `\nNICHE TEMPLATE CONTEXT (follow these pillar-specific guidelines):\n${pillarEnrichment}` : ""}
${userThought ? `\nUSER PERSONAL THOUGHT — integrate this naturally and authentically into the BODY of the caption. Do NOT quote it verbatim. Do NOT make it sound forced. Weave it in as if the author is speaking from experience:\n"${userThought}"` : ""}
${imageDescription ? `\nIMAGE SCENE DIRECTION — when generating scene_plan, base it on this description from the user: "${imageDescription}". Stay faithful to this visual but ensure it still obeys all ImageStyle rules.` : ""}
`;

    const textResp = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: textInstructions,
      input: textInput,
      temperature: 0.55,
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
    const imageHeadline = String(parsed.image_headline || "").trim();

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
            styleSpec.naturalPhotoColors
              ? "CRITICAL: Brand colors must ONLY appear in graphic design overlay elements (borders, accent bars, corner marks, scrim). The photo scene itself — people, clothing, skin, walls, furniture, environment — must use completely natural, realistic colors. Do NOT dress people in brand colors. Do NOT tint walls or backgrounds with brand colors."
              : styleSpec.brandingStrength === "heavy"
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

    // Get a pillar-specific visual scene suggestion if available
    const pillarSceneSuggestion = activePillar ? getRandomPillarScene(activePillar) : "";

    const layoutGuidelinesRule = styleSpec.allowText
      ? `LAYOUT GUIDELINES:
- Large bold headline, centered, high contrast — readable at mobile size.
- Text hierarchy: headline → optional subline → optional supporting detail → brand footer.
- Choose one layout pattern: (1) headline over photo with gradient/blur behind text, (2) semi-transparent panel with headline + bullet tips, (3) rounded card/block with headline over photo.
- Background photo should have one clear subject, avoid busy cluttered scenes.
- Ensure text readability with gradient fades, blur zones, or semi-transparent panels behind text.
- Subtle bottom footer zone for brand info (website/phone) when appropriate.
- Sleek and modern — graphic elements should enhance, not clutter.`
      : `LAYOUT GUIDELINES:
- One clear subject in the background, avoid busy cluttered scenes.
- Sleek, modern, Instagram-quality composition.`;

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

      pillarSceneSuggestion
        ? `PILLAR VISUAL INSPIRATION (adapt to fit image style and content, don't copy literally): ${pillarSceneSuggestion}`
        : "",

      "SCENE PLAN (style-compliant):",
      scenePlan || "",

      specific
        ? `SpecificRequest (visual interpretation, do not invent products): ${specific}`
        : "",

      layoutGuidelinesRule,

      "Quality: premium, Instagram-ready, high-end commercial aesthetic.",
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
      imageHeadline,
      imageBase64: `data:image/png;base64,${b64}`,
      imagePrompt: imageInstruction,
      createdAt: Date.now(),
    };

    // Increment token usage AFTER successful generation (skip refinements)
    if (!body.refinementText) {
      tokenStatus = await useToken(userId);
      console.log(`Token used for user ${userId}. Remaining: ${tokenStatus.remaining}`);
    }

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
      userId,
      tokenData: tokenStatus,
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
