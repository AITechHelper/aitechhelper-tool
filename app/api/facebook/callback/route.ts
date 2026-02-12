import { NextRequest, NextResponse } from "next/server";
import { upsertFacebookPage } from "../../../lib/facebook";

// GET /api/facebook/callback — handle OAuth callback from Facebook
export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aitechhelper-tool.vercel.app";

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // userId
    const error = searchParams.get("error");

    if (error) {
      console.error("Facebook OAuth error:", error, searchParams.get("error_description"));
      return NextResponse.redirect(
        new URL("/dashboard?facebook=denied", baseUrl)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?facebook=error", baseUrl)
      );
    }

    const userId = state;
    const appId = process.env.META_APP_ID!;
    const appSecret = process.env.META_APP_SECRET!;
    const redirectUri = `${baseUrl}/api/facebook/callback`;

    // Exchange code for user access token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&code=${code}`
    );

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      console.error("Facebook token exchange failed:", err);
      return NextResponse.redirect(
        new URL("/dashboard?facebook=error", baseUrl)
      );
    }

    const tokenData = await tokenRes.json();
    const shortLivedToken = tokenData.access_token;

    // Exchange short-lived token for long-lived token (60 days)
    // Page access tokens derived from a long-lived user token are non-expiring
    const longLivedRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token` +
      `?grant_type=fb_exchange_token` +
      `&client_id=${appId}` +
      `&client_secret=${appSecret}` +
      `&fb_exchange_token=${shortLivedToken}`
    );

    if (!longLivedRes.ok) {
      const err = await longLivedRes.text();
      console.error("Facebook long-lived token exchange failed:", err);
      return NextResponse.redirect(
        new URL("/dashboard?facebook=error", baseUrl)
      );
    }

    const longLivedData = await longLivedRes.json();
    const userAccessToken = longLivedData.access_token;

    // Get the user's pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
    );

    if (!pagesRes.ok) {
      const err = await pagesRes.text();
      console.error("Failed to fetch Facebook pages:", err);
      return NextResponse.redirect(
        new URL("/dashboard?facebook=error", baseUrl)
      );
    }

    const pagesData = await pagesRes.json();
    const pages = pagesData.data;

    if (!pages || pages.length === 0) {
      console.error("No Facebook pages found for user");
      return NextResponse.redirect(
        new URL("/dashboard?facebook=error&reason=no_pages", baseUrl)
      );
    }

    // Use the first page (most users have one main page)
    const page = pages[0];
    const pageId = page.id;
    const pageName = page.name;
    const pageAccessToken = page.access_token; // Page tokens don't expire if user token is long-lived

    // Save to database
    await upsertFacebookPage({
      userId,
      pageId,
      pageName,
      pageAccessToken,
    });

    return NextResponse.redirect(
      new URL(`/dashboard?facebook=connected&fb_page=${encodeURIComponent(pageName)}`, baseUrl)
    );
  } catch (error) {
    console.error("Facebook callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?facebook=error", baseUrl)
    );
  }
}
