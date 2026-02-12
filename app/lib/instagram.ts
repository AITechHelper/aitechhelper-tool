import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export interface InstagramAccount {
  id: number;
  userId: string;
  instagramUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt: Date | null;
  connectedAt: Date;
  updatedAt: Date;
}

// Get user's connected Instagram account
export async function getInstagramAccount(
  userId: string
): Promise<InstagramAccount | null> {
  const rows = await sql`
    SELECT
      id,
      user_id as "userId",
      instagram_user_id as "instagramUserId",
      username,
      access_token as "accessToken",
      token_expires_at as "tokenExpiresAt",
      connected_at as "connectedAt",
      updated_at as "updatedAt"
    FROM instagram_accounts
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return (rows[0] as InstagramAccount) || null;
}

// Save or update an Instagram account connection
export async function upsertInstagramAccount(data: {
  userId: string;
  instagramUserId: string;
  username: string;
  accessToken: string;
  tokenExpiresAt?: Date | null;
}): Promise<void> {
  await sql`
    INSERT INTO instagram_accounts (
      user_id, instagram_user_id, username, access_token, token_expires_at, updated_at
    ) VALUES (
      ${data.userId},
      ${data.instagramUserId},
      ${data.username},
      ${data.accessToken},
      ${data.tokenExpiresAt ?? null},
      NOW()
    )
    ON CONFLICT (user_id, instagram_user_id) DO UPDATE SET
      username = EXCLUDED.username,
      access_token = EXCLUDED.access_token,
      token_expires_at = EXCLUDED.token_expires_at,
      updated_at = NOW()
  `;
}

// Remove an Instagram account connection
export async function removeInstagramAccount(
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM instagram_accounts
    WHERE user_id = ${userId}
  `;
}

// Exchange short-lived token for long-lived token (60 days)
export async function exchangeForLongLivedToken(
  shortLivedToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const appSecret = process.env.INSTAGRAM_APP_SECRET!;
  const res = await fetch(
    `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to exchange token: ${err}`);
  }
  return res.json();
}

// Refresh a long-lived token (must be done before expiry)
export async function refreshLongLivedToken(
  token: string
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to refresh token: ${err}`);
  }
  return res.json();
}

// Get the correct Instagram user ID for publishing via the Graph API
// The ID from direct Instagram OAuth may differ from the one needed for publishing
async function getPublishableUserId(
  accessToken: string,
  instagramUserId: string
): Promise<string> {
  // First try: use the "me" endpoint to get the user's own ID
  const meRes = await fetch(
    `https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`
  );

  if (meRes.ok) {
    const meData = await meRes.json();
    // The user_id field from /me is the correct publishable ID
    if (meData.user_id) {
      return meData.user_id.toString();
    }
    // If the response has an id field, use that
    if (meData.id) {
      return meData.id.toString();
    }
  }

  // Fallback to the stored ID
  return instagramUserId;
}

// Publish a photo to Instagram (2-step: create container, then publish)
export async function publishToInstagram(
  accessToken: string,
  instagramUserId: string,
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  // Get the correct publishable user ID
  const publishUserId = await getPublishableUserId(accessToken, instagramUserId);
  console.log("Publishing to Instagram user ID:", publishUserId, "(stored ID was:", instagramUserId, ")");

  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.instagram.com/v21.0/${publishUserId}/media`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image_url: imageUrl,
        caption,
        access_token: accessToken,
      }),
    }
  );

  if (!containerRes.ok) {
    const err = await containerRes.text();
    throw new Error(`Failed to create media container: ${err}`);
  }

  const container = await containerRes.json();
  const containerId = container.id;

  // Step 2: Wait for container to be ready (Instagram needs time to process the image)
  const maxAttempts = 10;
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(
      `https://graph.instagram.com/v21.0/${containerId}?fields=status_code&access_token=${accessToken}`
    );
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      if (statusData.status_code === "FINISHED") {
        break;
      }
      if (statusData.status_code === "ERROR") {
        throw new Error("Instagram media processing failed");
      }
    }
    // Wait 2 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // Step 3: Publish the container
  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${publishUserId}/media_publish`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: accessToken,
      }),
    }
  );

  if (!publishRes.ok) {
    const err = await publishRes.text();
    throw new Error(`Failed to publish media: ${err}`);
  }

  return publishRes.json();
}
