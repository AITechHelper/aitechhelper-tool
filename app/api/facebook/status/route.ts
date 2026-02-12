import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getFacebookPage, removeFacebookPage } from "../../../lib/facebook";

// GET /api/facebook/status — check if user has connected Facebook
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const page = await getFacebookPage(userId);

    if (!page) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      pageName: page.pageName,
    });
  } catch (error) {
    console.error("Facebook status error:", error);
    return NextResponse.json(
      { error: "Failed to check Facebook status" },
      { status: 500 }
    );
  }
}

// DELETE /api/facebook/status — disconnect Facebook page
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeFacebookPage(userId);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("Facebook disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Facebook" },
      { status: 500 }
    );
  }
}
