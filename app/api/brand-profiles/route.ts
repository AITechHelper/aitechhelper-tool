import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import {
  getProfiles,
  createProfile,
  getActiveProfileId,
  type BrandProfile,
} from "../../lib/brandProfiles";

// GET /api/brand-profiles — list all profiles + active ID
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profiles = await getProfiles(userId);
    const activeProfileId = await getActiveProfileId(userId);

    return NextResponse.json({ profiles, activeProfileId });
  } catch (error) {
    console.error("Error fetching brand profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand profiles" },
      { status: 500 }
    );
  }
}

// POST /api/brand-profiles — create a new profile
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const profile: BrandProfile = {
      id: body.id || Date.now().toString(),
      name: body.name || "",
      niche: body.niche || "",
      audience: body.audience || "",
      tone: body.tone || "Confident",
      captionLength: body.captionLength || "Medium",
      hashtagCount: body.hashtagCount ?? 12,
      imageStyle: body.imageStyle || "lifestyle_photo",
      primaryColor: body.primaryColor || "#000000",
      secondaryColor: body.secondaryColor || "#ffffff",
      createdAt: body.createdAt || new Date().toISOString(),
    };

    const created = await createProfile(userId, profile);
    return NextResponse.json({ profile: created });
  } catch (error: any) {
    console.error("Error creating brand profile:", error);

    // Return friendly message for max profiles error
    if (error?.message?.includes("Maximum 5")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create brand profile" },
      { status: 500 }
    );
  }
}
