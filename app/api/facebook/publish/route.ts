import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getFacebookPage, publishToFacebook } from "../../../lib/facebook";

// POST /api/facebook/publish — publish a post to Facebook Page
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

    // Get the user's connected Facebook page
    const page = await getFacebookPage(userId);
    if (!page) {
      return NextResponse.json(
        { error: "No Facebook page connected. Please connect your account from the dashboard." },
        { status: 400 }
      );
    }

    // Upload image to temporary public URL (same as Instagram flow)
    const imageUrl = await uploadImageTemporarily(imageBase64);

    // Build full message with hashtags
    const fullMessage = hashtags
      ? `${caption}\n\n${hashtags}`
      : caption;

    // Publish to Facebook
    const result = await publishToFacebook(
      page.pageAccessToken,
      page.pageId,
      imageUrl,
      fullMessage
    );

    return NextResponse.json({
      success: true,
      postId: result.id,
      message: `Posted to ${page.pageName}`,
    });
  } catch (error: any) {
    console.error("Facebook publish error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish to Facebook" },
      { status: 500 }
    );
  }
}

// Upload base64 image to a temporary public URL
async function uploadImageTemporarily(base64DataUrl: string): Promise<string> {
  const base64Data = base64DataUrl.replace(/^data:image\/\w+;base64,/, "");

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
      throw new Error("Failed to upload image for Facebook posting");
    }

    const data = await res.json();
    return data.data.url;
  }

  throw new Error(
    "Image hosting not configured. Please add IMGBB_API_KEY to your environment variables."
  );
}
