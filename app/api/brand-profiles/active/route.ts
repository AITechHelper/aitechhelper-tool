import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { setActiveProfile, clearActiveProfile } from "../../../lib/brandProfiles";

// PUT /api/brand-profiles/active — set active profile
export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (!body.profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 }
      );
    }

    await setActiveProfile(userId, body.profileId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error setting active profile:", error);
    return NextResponse.json(
      { error: "Failed to set active profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/brand-profiles/active — clear active profile
export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearActiveProfile(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error clearing active profile:", error);
    return NextResponse.json(
      { error: "Failed to clear active profile" },
      { status: 500 }
    );
  }
}
