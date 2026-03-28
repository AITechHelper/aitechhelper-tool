import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export interface FacebookPage {
  id: number;
  userId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
  connectedAt: Date;
  updatedAt: Date;
}

// Get user's connected Facebook page
export async function getFacebookPage(
  userId: string
): Promise<FacebookPage | null> {
  const rows = await sql`
    SELECT
      id,
      user_id as "userId",
      page_id as "pageId",
      page_name as "pageName",
      page_access_token as "pageAccessToken",
      connected_at as "connectedAt",
      updated_at as "updatedAt"
    FROM facebook_pages
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return (rows[0] as FacebookPage) || null;
}

// Save or update a Facebook page connection
export async function upsertFacebookPage(data: {
  userId: string;
  pageId: string;
  pageName: string;
  pageAccessToken: string;
}): Promise<void> {
  await sql`
    INSERT INTO facebook_pages (
      user_id, page_id, page_name, page_access_token, updated_at
    ) VALUES (
      ${data.userId},
      ${data.pageId},
      ${data.pageName},
      ${data.pageAccessToken},
      NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      page_id = EXCLUDED.page_id,
      page_name = EXCLUDED.page_name,
      page_access_token = EXCLUDED.page_access_token,
      updated_at = NOW()
  `;
}

// Remove a Facebook page connection
export async function removeFacebookPage(
  userId: string
): Promise<void> {
  await sql`
    DELETE FROM facebook_pages
    WHERE user_id = ${userId}
  `;
}

// Publish a video to a Facebook Page
// videoUrl must be a publicly accessible HTTPS URL (e.g. Vercel Blob URL).
export async function publishVideoToFacebook(
  pageAccessToken: string,
  pageId: string,
  videoUrl: string,
  description: string
): Promise<{ id: string }> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/videos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file_url: videoUrl,
        description,
        access_token: pageAccessToken,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to publish video to Facebook: ${err}`);
  }

  return res.json();
}

// Publish a photo post to a Facebook Page
export async function publishToFacebook(
  pageAccessToken: string,
  pageId: string,
  imageUrl: string,
  message: string
): Promise<{ id: string }> {
  // Post a photo with message to the page
  const res = await fetch(
    `https://graph.facebook.com/v21.0/${pageId}/photos`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: imageUrl,
        message,
        access_token: pageAccessToken,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Failed to publish to Facebook: ${err}`);
  }

  return res.json();
}
