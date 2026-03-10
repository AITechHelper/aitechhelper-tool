import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// POST /api/caption-only — generate caption + hashtags for a user's own photo
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const niche = String(body.niche || "").trim();
    const audience = String(body.audience || "").trim();
    const tone = String(body.tone || "Confident").trim();
    const topic = String(body.topic || "").trim();
    const captionLength = String(body.captionLength || "Medium");
    const hashtagCount = Math.min(30, Math.max(0, parseInt(body.hashtagCount ?? "12", 10)));

    const lengthGuide =
      captionLength === "Short" ? "1-2 sentences" :
      captionLength === "Long" ? "5-7 sentences" :
      "3-4 sentences";

    const prompt = `You are a social media expert writing a post for a ${niche} targeting ${audience}.

Write a ${tone.toLowerCase()}-toned Instagram caption (${lengthGuide}) for a post about: "${topic || "their business"}".

Rules:
- Write in first person, natural and authentic
- Do NOT include hashtags in the caption text
- Do NOT use emojis unless the tone calls for it
- End with a clear call to action
- Return ONLY valid JSON with this exact structure:
{"caption": "...", "hashtags": "..."}

The hashtags field should be ${hashtagCount} relevant hashtags as a single space-separated string (e.g. "#realestate #homebuying").`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 600,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: { caption?: string; hashtags?: string } = {};
    try { parsed = JSON.parse(raw); } catch {}

    return NextResponse.json({
      caption: parsed.caption ?? "",
      hashtags: parsed.hashtags ?? "",
    });
  } catch (error) {
    console.error("Error generating caption:", error);
    return NextResponse.json({ error: "Failed to generate caption" }, { status: 500 });
  }
}
