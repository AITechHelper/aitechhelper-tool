import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getMediaAssets, createMediaAsset } from "../../lib/mediaAssets";

// GET /api/media-assets — list user's media assets
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const assets = await getMediaAssets(userId);
    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Error fetching media assets:", error);
    return NextResponse.json({ error: "Failed to fetch media assets" }, { status: 500 });
  }
}

// POST /api/media-assets — save an image or video asset
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const assetType: "image" | "video" = body.assetType === "video" ? "video" : "image";

    if (assetType === "video" && !body.videoUrl) {
      return NextResponse.json({ error: "videoUrl required for video assets" }, { status: 400 });
    }
    if (assetType === "image" && !body.imageBase64) {
      return NextResponse.json({ error: "imageBase64 required for image assets" }, { status: 400 });
    }

    const asset = await createMediaAsset(userId, {
      id: body.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: body.name ?? null,
      imageBase64: body.imageBase64 ?? null,
      videoUrl: body.videoUrl ?? null,
      assetType,
      aspectRatio: body.aspectRatio ?? null,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Error saving media asset:", error);
    return NextResponse.json({ error: "Failed to save media asset" }, { status: 500 });
  }
}
