import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getInstagramAccount, publishToInstagram } from "../../../lib/instagram";

// POST /api/instagram/publish — publish a post to Instagram
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { imageBase64, caption, hashtags } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "Image is required" },
        { status: 400 }
      );
    }

    // Get the user's connected Instagram account
    const account = await getInstagramAccount(userId);
    if (!account) {
      return NextResponse.json(
        { error: "No Instagram account connected. Please connect your account from the dashboard." },
        { status: 400 }
      );
    }

    // Check token expiry
    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Instagram token expired. Please reconnect your account from the dashboard." },
        { status: 401 }
      );
    }

    // Instagram API requires a publicly accessible image URL, not base64.
    // We need to upload the image temporarily. We'll use a data URL approach:
    // Upload base64 to a temporary public URL via our own endpoint.
    // For now, we'll upload to imgbb or similar, or use a Vercel Blob.
    // The simplest approach: upload the base64 to a temporary hosting service.

    // Convert base64 to a publicly accessible URL
    // Instagram requires the image to be at a public URL, so we need to host it temporarily
    const imageUrl = await uploadImageTemporarily(imageBase64);

    // Build full caption with hashtags
    const fullCaption = hashtags
      ? `${caption}\n\n${hashtags}`
      : caption;

    // Publish to Instagram
    const result = await publishToInstagram(
      account.accessToken,
      account.instagramUserId,
      imageUrl,
      fullCaption
    );

    return NextResponse.json({
      success: true,
      mediaId: result.id,
      message: `Posted to @${account.username}`,
    });
  } catch (error: any) {
    console.error("Instagram publish error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish to Instagram" },
      { status: 500 }
    );
  }
}

// Upload base64 image to a temporary public URL
// Instagram's API requires a publicly accessible URL for the image
async function uploadImageTemporarily(base64DataUrl: string): Promise<string> {
  // Strip the data URL prefix to get raw base64
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");

  // Use Vercel Blob if available, otherwise fall back to imgbb
  // For simplicity, we'll use the free imgbb API
  const imgbbKey = process.env.IMGBB_API_KEY;

  if (imgbbKey) {
    const formData = new FormData();
    formData.append("key", imgbbKey);
    formData.append("image", base64Data);
    formData.append("expiration", "600"); // 10 minutes

    const res = await fetch("https://api.imgbb.com/1/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload image for Instagram posting");
    }

    const data = await res.json();
    // display_url is the direct image URL (i.ibb.co/...) — not data.url which is the page URL
    return data.data.display_url || data.data.image?.url || data.data.url;
  }

  // Fallback: Use a simple blob-based approach
  // Convert base64 to buffer and create a temporary URL via our own API
  throw new Error(
    "Image hosting not configured. Please add IMGBB_API_KEY to your environment variables. " +
    "Get a free API key at https://api.imgbb.com/"
  );
}
