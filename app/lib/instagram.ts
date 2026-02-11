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

// Publish a photo to Instagram (2-step: create container, then publish)
export async function publishToInstagram(
  accessToken: string,
  instagramUserId: string,
  imageUrl: string,
  caption: string
): Promise<{ id: string }> {
  // Step 1: Create media container
  const containerRes = await fetch(
    `https://graph.instagram.com/v21.0/${instagramUserId}/media`,
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

  // Step 2: Publish the container
  const publishRes = await fetch(
    `https://graph.instagram.com/v21.0/${instagramUserId}/media_publish`,
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
