import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getPosts, createPost } from "../../lib/posts";

// GET /api/posts — list user's posts
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50");

    const posts = await getPosts(userId, limit);
    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching posts:", error);
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

// POST /api/posts — save a new post
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const post = await createPost(userId, {
      id: body.id ?? Date.now().toString(),
      profileId: body.profileId,
      calendarDay: body.calendarDay,
      month: body.month,
      hasImage: body.hasImage ?? false,
      imageBase64: body.imageBase64,
      caption: body.caption ?? "",
      hashtags: body.hashtags ?? "",
      postType: body.postType ?? "",
      imageStyle: body.imageStyle ?? "",
      tone: body.tone ?? "",
      niche: body.niche ?? "",
      audience: body.audience ?? "",
      createdAt: body.createdAt ?? new Date().toISOString(),
    });

    return NextResponse.json({ post });
  } catch (error) {
    console.error("Error saving post:", error);
    return NextResponse.json({ error: "Failed to save post" }, { status: 500 });
  }
}
