import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { deleteMediaAsset } from "../../../lib/mediaAssets";

// DELETE /api/media-assets/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    await deleteMediaAsset(userId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media asset:", error);
    return NextResponse.json({ error: "Failed to delete media asset" }, { status: 500 });
  }
}
