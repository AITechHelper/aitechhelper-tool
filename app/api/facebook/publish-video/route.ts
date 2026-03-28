// app/api/facebook/publish-video/route.ts
// Publish a video to a connected Facebook Page.
// Requires a publicly accessible videoUrl (Vercel Blob URL from generate-video flow).

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getFacebookPage, publishVideoToFacebook } from "../../../lib/facebook";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { videoUrl, caption, hashtags } = body;

    if (!videoUrl) {
      return NextResponse.json({ error: "videoUrl is required" }, { status: 400 });
    }

    const page = await getFacebookPage(userId);
    if (!page) {
      return NextResponse.json(
        { error: "No Facebook page connected. Please connect from the dashboard." },
        { status: 400 }
      );
    }

    const description = hashtags ? `${caption}\n\n${hashtags}` : caption ?? "";

    const result = await publishVideoToFacebook(
      page.pageAccessToken,
      page.pageId,
      videoUrl,
      description
    );

    return NextResponse.json({
      success: true,
      videoId: result.id,
      message: `Posted video to ${page.pageName}`,
    });
  } catch (error: any) {
    console.error("Facebook video publish error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish video to Facebook" },
      { status: 500 }
    );
  }
}
