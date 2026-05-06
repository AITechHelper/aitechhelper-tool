import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getScheduledPostsForMonth, createScheduledPost } from "../../lib/scheduledPosts";

// GET /api/scheduled-posts?year=2026&month=4  (month is 0-indexed)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth()));

    const posts = await getScheduledPostsForMonth(userId, year, month);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching scheduled posts:", error);
    return NextResponse.json({ error: "Failed to fetch scheduled posts" }, { status: 500 });
  }
}

// POST /api/scheduled-posts — schedule a post
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { savedPostId, platform, scheduledFor, captionOverride, hashtagsOverride } = body;

    if (!savedPostId || !platform || !scheduledFor) {
      return NextResponse.json({ error: "savedPostId, platform, and scheduledFor are required" }, { status: 400 });
    }

    const id = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await createScheduledPost({
      id,
      userId,
      savedPostId,
      platform,
      scheduledFor: new Date(scheduledFor),
      captionOverride: captionOverride ?? null,
      hashtagsOverride: hashtagsOverride ?? null,
    });

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Error creating scheduled post:", error);
    return NextResponse.json({ error: "Failed to schedule post" }, { status: 500 });
  }
}
