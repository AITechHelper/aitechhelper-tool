// app/api/instagram/publish-reel/route.ts
// Publish a video to Instagram as a Reel.
// Requires a publicly accessible videoUrl (Vercel Blob URL from generate-video flow).

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getInstagramAccount, publishReelToInstagram } from "../../../lib/instagram";

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

    const account = await getInstagramAccount(userId);
    if (!account) {
      return NextResponse.json(
        { error: "No Instagram account connected. Please connect from the dashboard." },
        { status: 400 }
      );
    }

    if (account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date()) {
      return NextResponse.json(
        { error: "Instagram token expired. Please reconnect from the dashboard." },
        { status: 401 }
      );
    }

    const fullCaption = hashtags ? `${caption}\n\n${hashtags}` : caption ?? "";

    const result = await publishReelToInstagram(
      account.accessToken,
      account.instagramUserId,
      videoUrl,
      fullCaption
    );

    return NextResponse.json({
      success: true,
      mediaId: result.id,
      message: `Posted Reel to @${account.username}`,
    });
  } catch (error: any) {
    console.error("Instagram Reel publish error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to publish Reel to Instagram" },
      { status: 500 }
    );
  }
}
