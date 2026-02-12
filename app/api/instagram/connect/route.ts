import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// GET /api/instagram/connect — redirect user to Instagram OAuth
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const appId = process.env.INSTAGRAM_APP_ID!;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app"}/api/instagram/callback`;
    const scope = "instagram_business_basic,instagram_business_content_publish";

    const authUrl =
      `https://api.instagram.com/oauth/authorize` +
      `?client_id=${appId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${userId}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Instagram connect error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?instagram=error", process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app")
    );
  }
}
