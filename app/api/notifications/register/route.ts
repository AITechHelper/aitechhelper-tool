import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { upsertDeviceToken, removeDeviceToken } from "../../../lib/deviceTokens";

// POST /api/notifications/register — save a device push token
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token, platform } = await request.json();
    if (!token || !platform) {
      return NextResponse.json({ error: "token and platform are required" }, { status: 400 });
    }

    await upsertDeviceToken(userId, token, platform);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error registering device token:", error);
    return NextResponse.json({ error: "Failed to register token" }, { status: 500 });
  }
}

// DELETE /api/notifications/register — remove a token (on logout / permission revoke)
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { token } = await request.json();
    if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

    await removeDeviceToken(token);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing device token:", error);
    return NextResponse.json({ error: "Failed to remove token" }, { status: 500 });
  }
}
