import { NextRequest, NextResponse } from "next/server";
import {
  upsertInstagramAccount,
  exchangeForLongLivedToken,
} from "../../../lib/instagram";

// GET /api/instagram/callback — handle OAuth callback from Instagram
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app";

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      console.error("Instagram OAuth error:", error, searchParams.get("error_description"));
      return NextResponse.redirect(
        new URL("/dashboard?instagram=denied", baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?instagram=error", baseUrl)
      );
    }

    const userId = state;
    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.INSTAGRAM_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/instagram/callback`;

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        }),
      }
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Token exchange failed:", err);
      return NextResponse.redirect(
        new URL("/dashboard?instagram=error", baseUrl)
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;
    const igUserId = tokenData.user_id?.toString();

    // Exchange for long-lived token (60 days)
    const longLived = await exchangeForLongLivedToken(shortLivedToken);
    const expiresAt = new Date(Date.now() + longLived.expires_in * 1000);

    // Get user profile info
    const profileRes = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=username&access_token=${longLived.access_token}`
    );
    const profileData = await profileRes.json();
    const username = profileData.username || "unknown";

    // Save to database
    await upsertInstagramAccount({
      userId,
      instagramUserId: igUserId,
      username,
      accessToken: longLived.access_token,
      tokenExpiresAt: expiresAt,
    });

    return NextResponse.redirect(
      new URL(`/dashboard?instagram=connected&ig_user=${username}`, baseUrl)
    );
  } catch (error) {
    console.error("Instagram callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?instagram=error", baseUrl)
    );
  }
}
