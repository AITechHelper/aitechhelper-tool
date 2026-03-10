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
  imageBase64: string;
  createdAt: string;
}

export async function getMediaAssets(userId: string): Promise<MediaAsset[]> {
  const rows = await sql`
    SELECT
      id,
      name,
      image_base64 AS "imageBase64",
      created_at AS "createdAt"
    FROM media_assets
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `;
  return rows as MediaAsset[];
}

export async function createMediaAsset(
  userId: string,
  asset: { id: string; name?: string; imageBase64: string }
): Promise<MediaAsset> {
  const rows = await sql`
    INSERT INTO media_assets (id, user_id, name, image_base64)
    VALUES (${asset.id}, ${userId}, ${asset.name ?? null}, ${asset.imageBase64})
    RETURNING id, name, image_base64 AS "imageBase64", created_at AS "createdAt"
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
