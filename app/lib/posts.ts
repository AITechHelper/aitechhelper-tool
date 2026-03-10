import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export interface SavedPost {
  id: string;
  profileId?: string;
  calendarDay?: number;
  month?: string;
  hasImage?: boolean;
  imageBase64?: string;
  caption: string;
  hashtags: string;
  postType: string;
  imageStyle: string;
  tone: string;
  niche: string;
  audience: string;
  createdAt: string;
}

export async function getPosts(userId: string, limit = 50): Promise<SavedPost[]> {
  const rows = await sql`
    SELECT
      id,
      profile_id     AS "profileId",
      calendar_day   AS "calendarDay",
      month,
      has_image      AS "hasImage",
      image_base64   AS "imageBase64",
      caption,
      hashtags,
      post_type      AS "postType",
      image_style    AS "imageStyle",
      tone,
      niche,
      audience,
      created_at     AS "createdAt"
    FROM saved_posts
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return rows as SavedPost[];
}

export async function createPost(userId: string, post: SavedPost): Promise<SavedPost> {
  const rows = await sql`
    INSERT INTO saved_posts (
      id, user_id, profile_id, calendar_day, month,
      has_image, image_base64,
      caption, hashtags, post_type, image_style, tone, niche, audience,
      created_at
    ) VALUES (
      ${post.id}, ${userId}, ${post.profileId ?? null},
      ${post.calendarDay ?? null}, ${post.month ?? null},
      ${post.hasImage ?? false}, ${post.imageBase64 ?? null},
      ${post.caption}, ${post.hashtags}, ${post.postType},
      ${post.imageStyle}, ${post.tone}, ${post.niche}, ${post.audience},
      ${post.createdAt}
    )
    ON CONFLICT (id, user_id) DO NOTHING
    RETURNING
      id,
      profile_id   AS "profileId",
      calendar_day AS "calendarDay",
      month,
      has_image    AS "hasImage",
      image_base64 AS "imageBase64",
      caption, hashtags,
      post_type    AS "postType",
      image_style  AS "imageStyle",
      tone, niche, audience,
      created_at   AS "createdAt"
  `;
  return (rows[0] ?? post) as SavedPost;
}

export async function deletePost(userId: string, postId: string): Promise<void> {
  await sql`
    DELETE FROM saved_posts WHERE id = ${postId} AND user_id = ${userId}
  `;
}

export async function updatePost(
  userId: string,
  postId: string,
  updates: {
    caption?: string;
    hashtags?: string;
    postType?: string;
    imageBase64?: string;
    hasImage?: boolean;
  }
): Promise<void> {
  await sql`
    UPDATE saved_posts SET
      caption      = COALESCE(${updates.caption ?? null}, caption),
      hashtags     = COALESCE(${updates.hashtags ?? null}, hashtags),
      post_type    = COALESCE(${updates.postType ?? null}, post_type),
      image_base64 = COALESCE(${updates.imageBase64 ?? null}, image_base64),
      has_image    = COALESCE(${updates.hasImage ?? null}::boolean, has_image)
    WHERE id = ${postId} AND user_id = ${userId}
  `;
}
