import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/facebook/connect — redirect user to Facebook OAuth
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appId = process.env.META_APP_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app"}/api/facebook/callback`;
    const scope = "business_management,pages_show_list,pages_manage_posts";

    const authUrl =
      `https://www.facebook.com/v21.0/dialog/oauth` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&auth_type=rerequest` +
      `&state=${userId}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Facebook connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?facebook=error", process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app")
    );
  }
}
