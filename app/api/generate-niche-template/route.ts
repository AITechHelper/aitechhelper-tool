// app/api/generate-niche-template/route.ts
// One-shot OpenAI call to generate a full NicheTemplate for any niche.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import OpenAI from "openai";
import { updateProfile } from "../../lib/brandProfiles";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const niche: string = (body.niche ?? "").trim();
  const profileId: string | undefined = body.profileId ?? undefined;
  if (!niche) return NextResponse.json({ error: "Niche is required" }, { status: 400 });

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const slug = niche.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

  const systemPrompt = `You are a social media content strategist. Generate a complete 5-pillar content template for a "${niche}" business.

Return ONLY valid JSON — no markdown fences, no explanation, just the raw JSON object.

Required structure:
{
  "id": "custom_${slug}",
  "label": "${niche}",
  "weeklyStructure": ["pillar_1_id", "pillar_2_id", "pillar_3_id", "pillar_4_id", "pillar_5_id"],
  "pillars": {
    "pillar_1_id": {
      "id": "pillar_1_id",
      "label": "Pillar Name",
      "detail": "1-2 sentence description shown on the calendar.",
      "postTypeHint": "Authority",
      "imageStyleHint": "branding_text_photo",
      "captionLength": "Medium",
      "hashtagPack": "standard",
      "promptRules": "Detailed 200+ word AI instructions for this pillar. Include: goal, content approach (5+ angle options), tone & voice guidance, caption structure (hook/body/CTA), and what NOT to do.",
      "ctaBank": ["cta 1", "cta 2", "cta 3", "cta 4", "cta 5", "cta 6", "cta 7", "cta 8"],
      "hashtagBank": ["#tag1", "#tag2", ... 15-20 niche-relevant hashtags],
      "postIdeas": ["specific post idea 1", "idea 2", "idea 3", "idea 4", "idea 5", "idea 6"],
      "captionHooks": ["opening hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
      "imageSceneBank": ["DALL-E visual scene description 1", "scene 2", "scene 3", "scene 4"]
    },
    ... (5 pillars total, each with unique id matching weeklyStructure)
  },
  "tonePreset": "Confident",
  "defaultHashtagCount": 12
}

Rules:
- Create exactly 5 strategic content pillars for a ${niche} (Mon-Fri rotation)
- postTypeHint must be one of: "Authority", "Educational", "Engagement", "Before & After", "Problem → Solution", "Seasonal"
- imageStyleHint must be one of: "lifestyle_photo", "branding_photo", "branding_text_photo", "branding_text_only", or null
- captionLength must be: "Short", "Medium", or "Long"
- hashtagPack must be: "light", "standard", or "heavy"
- tonePreset must be: "Confident", "Energetic", "Warm", "Professional", or "Playful"
- promptRules must be 200+ words and highly specific to the niche and pillar
- hashtagBank: 15-20 hashtags all starting with #
- imageSceneBank: 4 detailed DALL-E-ready visual descriptions (no text on images)
- Each pillar should serve a distinct strategic purpose for a ${niche}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4.1-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate the complete social media content template for: ${niche}` },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  });

  const raw = completion.choices[0].message.content?.trim() ?? "";

  // Strip markdown code fences if present
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

  let template: object;
  try {
    template = JSON.parse(cleaned);
  } catch {
    return NextResponse.json({ error: "Failed to parse generated template" }, { status: 500 });
  }

  // Persist to the brand profile in the DB so it's available on any device
  if (profileId) {
    try {
      await updateProfile(userId, profileId, { generatedTemplate: template });
    } catch {
      // Non-fatal — template still returned to client for localStorage caching
    }
  }

  return NextResponse.json({ template });
}
