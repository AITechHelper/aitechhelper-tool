import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export interface ScheduledPost {
  id: string;
  userId: string;
  savedPostId: string;
  platform: "instagram" | "facebook" | "both";
  scheduledFor: Date;
  status: "pending" | "published" | "skipped";
  captionOverride: string | null;
  hashtagsOverride: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export async function getScheduledPosts(userId: string): Promise<ScheduledPost[]> {
  const rows = await sql`
    SELECT
      id,
      user_id as "userId",
      saved_post_id as "savedPostId",
      platform,
      scheduled_for as "scheduledFor",
      status,
      caption_override as "captionOverride",
      hashtags_override as "hashtagsOverride",
      published_at as "publishedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM scheduled_posts
    WHERE user_id = ${userId}
    ORDER BY scheduled_for ASC
  `;
  return rows as ScheduledPost[];
}

export async function getScheduledPostsForMonth(
  userId: string,
  year: number,
  month: number
): Promise<ScheduledPost[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59);
  const rows = await sql`
    SELECT
      id,
      user_id as "userId",
      saved_post_id as "savedPostId",
      platform,
      scheduled_for as "scheduledFor",
      status,
      caption_override as "captionOverride",
      hashtags_override as "hashtagsOverride",
      published_at as "publishedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM scheduled_posts
    WHERE user_id = ${userId}
      AND scheduled_for >= ${start.toISOString()}
      AND scheduled_for <= ${end.toISOString()}
    ORDER BY scheduled_for ASC
  `;
  return rows as ScheduledPost[];
}

export async function getScheduledPostBySavedPostId(
  userId: string,
  savedPostId: string
): Promise<ScheduledPost | null> {
  const rows = await sql`
    SELECT
      id,
      user_id as "userId",
      saved_post_id as "savedPostId",
      platform,
      scheduled_for as "scheduledFor",
      status,
      caption_override as "captionOverride",
      hashtags_override as "hashtagsOverride",
      published_at as "publishedAt",
      created_at as "createdAt",
      updated_at as "updatedAt"
    FROM scheduled_posts
    WHERE user_id = ${userId} AND saved_post_id = ${savedPostId}
    LIMIT 1
  `;
  return (rows[0] as ScheduledPost) || null;
}

export async function createScheduledPost(data: {
  id: string;
  userId: string;
  savedPostId: string;
  platform: "instagram" | "facebook" | "both";
  scheduledFor: Date;
  captionOverride?: string | null;
  hashtagsOverride?: string | null;
}): Promise<void> {
  await sql`
    INSERT INTO scheduled_posts (
      id, user_id, saved_post_id, platform, scheduled_for,
      caption_override, hashtags_override, status, updated_at
    ) VALUES (
      ${data.id},
      ${data.userId},
      ${data.savedPostId},
      ${data.platform},
      ${data.scheduledFor.toISOString()},
      ${data.captionOverride ?? null},
      ${data.hashtagsOverride ?? null},
      'pending',
      NOW()
    )
    ON CONFLICT (id, user_id) DO UPDATE SET
      platform = EXCLUDED.platform,
      scheduled_for = EXCLUDED.scheduled_for,
      caption_override = EXCLUDED.caption_override,
      hashtags_override = EXCLUDED.hashtags_override,
      status = 'pending',
      updated_at = NOW()
  `;
}

export async function updateScheduledPost(
  id: string,
  userId: string,
  data: {
    platform?: "instagram" | "facebook" | "both";
    scheduledFor?: Date;
    captionOverride?: string | null;
    hashtagsOverride?: string | null;
    status?: "pending" | "published" | "skipped";
  }
): Promise<void> {
  const fields: string[] = ["updated_at = NOW()"];
  const values: any[] = [];

  if (data.platform !== undefined) {
    values.push(data.platform);
    fields.push(`platform = $${values.length}`);
  }
  if (data.scheduledFor !== undefined) {
    values.push(data.scheduledFor.toISOString());
    fields.push(`scheduled_for = $${values.length}`);
  }
  if (data.captionOverride !== undefined) {
    values.push(data.captionOverride);
    fields.push(`caption_override = $${values.length}`);
  }
  if (data.hashtagsOverride !== undefined) {
    values.push(data.hashtagsOverride);
    fields.push(`hashtags_override = $${values.length}`);
  }
  if (data.status !== undefined) {
    values.push(data.status);
    fields.push(`status = $${values.length}`);
    if (data.status === "published") {
      fields.push("published_at = NOW()");
    }
  }

  values.push(id);
  values.push(userId);

  const setClause = fields.join(", ");
  const idIdx = values.length - 1;
  const userIdx = values.length;

  // Use tagged template for safety — rebuild with neon tagged template
  await sql`
    UPDATE scheduled_posts
    SET updated_at = NOW(),
        platform = COALESCE(${data.platform ?? null}, platform),
        scheduled_for = COALESCE(${data.scheduledFor?.toISOString() ?? null}, scheduled_for),
        caption_override = CASE WHEN ${data.captionOverride !== undefined} THEN ${data.captionOverride ?? null} ELSE caption_override END,
        hashtags_override = CASE WHEN ${data.hashtagsOverride !== undefined} THEN ${data.hashtagsOverride ?? null} ELSE hashtags_override END,
        status = COALESCE(${data.status ?? null}, status),
        published_at = CASE WHEN ${data.status === "published"} THEN NOW() ELSE published_at END
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function deleteScheduledPost(id: string, userId: string): Promise<void> {
  await sql`
    DELETE FROM scheduled_posts
    WHERE id = ${id} AND user_id = ${userId}
  `;
}

export async function markScheduledPostPublished(id: string, userId: string): Promise<void> {
  await sql`
    UPDATE scheduled_posts
    SET status = 'published', published_at = NOW(), updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
  `;
}
