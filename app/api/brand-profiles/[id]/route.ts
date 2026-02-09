import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { updateProfile, deleteProfile } from "../../../lib/brandProfiles";

// PUT /api/brand-profiles/[id] — update a profile
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updated = await updateProfile(userId, id, body);
    if (!updated) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile: updated });
  } catch (error) {
    console.error("Error updating brand profile:", error);
    return NextResponse.json(
      { error: "Failed to update brand profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/brand-profiles/[id] — delete a profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await deleteProfile(userId, id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting brand profile:", error);
    return NextResponse.json(
      { error: "Failed to delete brand profile" },
      { status: 500 }
    );
  }
}
