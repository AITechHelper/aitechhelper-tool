import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { updateScheduledPost, deleteScheduledPost } from "../../../lib/scheduledPosts";

// PUT /api/scheduled-posts/[id] — update platform, time, or caption/hashtag overrides
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();
    const { platform, scheduledFor, captionOverride, hashtagsOverride } = body;

    await updateScheduledPost(id, userId, {
      platform,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      captionOverride,
      hashtagsOverride,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating scheduled post:", error);
    return NextResponse.json({ error: "Failed to update scheduled post" }, { status: 500 });
  }
}

// DELETE /api/scheduled-posts/[id] — remove a scheduled post
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteScheduledPost(id, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduled post:", error);
    return NextResponse.json({ error: "Failed to delete scheduled post" }, { status: 500 });
  }
}
