import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export interface MediaAsset {
  id: string;
  userId?: string;
  name: string | null;
  imageBase64: string | null;  // null for video assets
  videoUrl: string | null;     // null for image assets (Vercel Blob URL)
  assetType: "image" | "video";
  aspectRatio: string | null;  // e.g. "9:16", "1:1", "16:9"
  createdAt: string;
}

export async function getMediaAssets(userId: string): Promise<MediaAsset[]> {
  const rows = await sql`
    SELECT
      id,
      name,
      image_base64 AS "imageBase64",
      COALESCE(video_url, NULL) AS "videoUrl",
      COALESCE(asset_type, 'image') AS "assetType",
      aspect_ratio AS "aspectRatio",
      created_at AS "createdAt"
    FROM media_assets
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as MediaAsset[];
}

export async function createMediaAsset(
  userId: string,
  asset: {
    id: string;
    name?: string;
    imageBase64?: string;
    videoUrl?: string;
    assetType?: "image" | "video";
    aspectRatio?: string;
  }
): Promise<MediaAsset> {
  const assetType = asset.assetType ?? "image";
  const rows = await sql`
    INSERT INTO media_assets (id, user_id, name, image_base64, video_url, asset_type, aspect_ratio)
    VALUES (
      ${asset.id},
      ${userId},
      ${asset.name ?? null},
      ${asset.imageBase64 ?? null},
      ${asset.videoUrl ?? null},
      ${assetType},
      ${asset.aspectRatio ?? null}
    )
    RETURNING
      id,
      name,
      image_base64 AS "imageBase64",
      video_url AS "videoUrl",
      COALESCE(asset_type, 'image') AS "assetType",
      aspect_ratio AS "aspectRatio",
      created_at AS "createdAt"
  `;
  return rows[0] as MediaAsset;
}

export async function deleteMediaAsset(
  userId: string,
  assetId: string
): Promise<void> {
  await sql`
    DELETE FROM media_assets
    WHERE id = ${assetId} AND user_id = ${userId}
  `;
}

export async function getMediaAssetCount(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*) AS count FROM media_assets WHERE user_id = ${userId}
  `;
  return parseInt(rows[0]?.count ?? "0", 10);
}
