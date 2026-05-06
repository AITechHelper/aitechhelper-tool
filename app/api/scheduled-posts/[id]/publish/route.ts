import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { getScheduledPostBySavedPostId, markScheduledPostPublished } from "../../../../lib/scheduledPosts";
import { getInstagramAccount, publishToInstagram } from "../../../../lib/instagram";
import { getFacebookPage, publishToFacebook } from "../../../../lib/facebook";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

async function uploadImageTemporarily(base64DataUrl: string): Promise<string> {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imgbbKey = process.env.IMGBB_API_KEY;

  if (!imgbbKey) {
    throw new Error("Image hosting not configured. Please add IMGBB_API_KEY to your environment variables.");
  }

  const formData = new FormData();
  formData.append("key", imgbbKey);
  formData.append("image", base64Data);
  formData.append("expiration", "600");

  const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("Failed to upload image for publishing");

  const data = await res.json();
  return data.data.display_url || data.data.image?.url || data.data.url;
}

// POST /api/scheduled-posts/[id]/publish — publish a scheduled post now
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    // Load the scheduled post
    const rows = await sql`
      SELECT
        id,
        user_id as "userId",
        saved_post_id as "savedPostId",
        platform,
        status,
        caption_override as "captionOverride",
        hashtags_override as "hashtagsOverride"
      FROM scheduled_posts
      WHERE id = ${id} AND user_id = ${userId}
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Scheduled post not found" }, { status: 404 });
    }

    const scheduled = rows[0] as any;
    if (scheduled.status === "published") {
      return NextResponse.json({ error: "Already published" }, { status: 400 });
    }

    // Load the saved post to get image + caption + hashtags
    const postRows = await sql`
      SELECT caption, hashtags, image_base64 as "imageBase64", has_image as "hasImage"
      FROM saved_posts
      WHERE id = ${scheduled.savedPostId} AND user_id = ${userId}
      LIMIT 1
    `;

    if (!postRows.length) {
      return NextResponse.json({ error: "Original post not found" }, { status: 404 });
    }

    const post = postRows[0] as any;

    // Use overrides if set, otherwise fall back to original
    const caption = scheduled.captionOverride ?? post.caption ?? "";
    const hashtags = scheduled.hashtagsOverride ?? post.hashtags ?? "";
    const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption;
    const imageBase64: string = post.imageBase64;

    if (!imageBase64) {
      return NextResponse.json({ error: "No image found for this post" }, { status: 400 });
    }

    const imageUrl = await uploadImageTemporarily(imageBase64);

    const results: { instagram?: string; facebook?: string } = {};
    const errors: string[] = [];

    if (scheduled.platform === "instagram" || scheduled.platform === "both") {
      const account = await getInstagramAccount(userId);
      if (!account) {
        errors.push("Instagram not connected");
      } else if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
        errors.push("Instagram token expired — reconnect from dashboard");
      } else {
        try {
          const result = await publishToInstagram(account.accessToken, account.instagramUserId, imageUrl, fullCaption);
          results.instagram = result.id;
        } catch (e: any) {
          errors.push(`Instagram: ${e?.message ?? "publish failed"}`);
        }
      }
    }

    if (scheduled.platform === "facebook" || scheduled.platform === "both") {
      const page = await getFacebookPage(userId);
      if (!page) {
        errors.push("Facebook not connected");
      } else {
        try {
          const result = await publishToFacebook(page.pageAccessToken, page.pageId, imageUrl, fullCaption);
          results.facebook = result.id;
        } catch (e: any) {
          errors.push(`Facebook: ${e?.message ?? "publish failed"}`);
        }
      }
    }

    // Mark published if at least one platform succeeded
    const anySuccess = results.instagram || results.facebook;
    if (anySuccess) {
      await markScheduledPostPublished(id, userId);
    }

    if (errors.length && !anySuccess) {
      return NextResponse.json({ error: errors.join("; ") }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results,
      warnings: errors.length ? errors : undefined,
    });
  } catch (error: any) {
    console.error("Scheduled post publish error:", error);
    return NextResponse.json({ error: error?.message || "Failed to publish" }, { status: 500 });
  }
}
