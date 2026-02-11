import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getInstagramAccount, removeInstagramAccount } from "../../../lib/instagram";

// GET /api/instagram/status — check if user has connected Instagram
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await getInstagramAccount(userId);

    if (!account) {
      return NextResponse.json({ connected: false });
    }

    // Check if token is expired
    const isExpired = account.tokenExpiresAt && new Date(account.tokenExpiresAt) < new Date();

    return NextResponse.json({
      connected: !isExpired,
      username: account.username,
      tokenExpired: isExpired,
    });
  } catch (error) {
    console.error("Instagram status error:", error);
    return NextResponse.json(
      { error: "Failed to check Instagram status" },
      { status: 500 }
    );
  }
}

// DELETE /api/instagram/status — disconnect Instagram account
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await removeInstagramAccount(userId);
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    console.error("Instagram disconnect error:", error);
    return NextResponse.json(
      { error: "Failed to disconnect Instagram" },
      { status: 500 }
    );
  }
}
