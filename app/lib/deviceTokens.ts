import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export async function upsertDeviceToken(
  userId: string,
  token: string,
  platform: "ios" | "android" | "web"
): Promise<void> {
  await sql`
    INSERT INTO device_tokens (user_id, token, platform, updated_at)
    VALUES (${userId}, ${token}, ${platform}, NOW())
    ON CONFLICT (user_id, token) DO UPDATE SET
      platform = EXCLUDED.platform,
      updated_at = NOW()
  `;
}

export async function removeDeviceToken(token: string): Promise<void> {
  await sql`DELETE FROM device_tokens WHERE token = ${token}`;
}

export async function getTokensForUser(userId: string): Promise<string[]> {
  const rows = await sql`
    SELECT token FROM device_tokens WHERE user_id = ${userId}
  `;
  return rows.map((r: any) => r.token);
}

// Returns { userId, tokens[] } for all users who have pending scheduled posts due today
export async function getUsersWithDueScheduledPosts(): Promise<
  { userId: string; tokens: string[]; postCount: number }[]
> {
  const rows = await sql`
    SELECT
      sp.user_id as "userId",
      COUNT(sp.id)::int as "postCount",
      ARRAY_AGG(dt.token) FILTER (WHERE dt.token IS NOT NULL) as tokens
    FROM scheduled_posts sp
    LEFT JOIN device_tokens dt ON dt.user_id = sp.user_id
    WHERE sp.status = 'pending'
      AND sp.scheduled_for::date <= NOW()::date
    GROUP BY sp.user_id
    HAVING ARRAY_AGG(dt.token) FILTER (WHERE dt.token IS NOT NULL) IS NOT NULL
  `;
  return rows.map((r: any) => ({
    userId: r.userId,
    postCount: r.postCount,
    tokens: r.tokens || [],
  }));
}
