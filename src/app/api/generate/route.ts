import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const body = await req.json();

  const {
    niche,
    audience,
    tone,
    frequency,
  } = body;

  const prompt = `
You are an AI social media strategist.

Create a 7-day Instagram content plan for:
Niche: ${niche}
Audience: ${audience}
Tone: ${tone}
Posts per week: ${frequency}

For each post, return:
- Post idea
- Caption
- Hashtags
- Best day and time to post
- Short explanation of why this post works

Return the result in clear, readable text.
`;

  const response = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  return NextResponse.json({
    result: response.output_text,
  });
}

