import { neon } from "@neondatabase/serverless";

// Lazy initialization — module-level neon() threw when DATABASE_URL was missing
let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

const MAX_PROFILES_PER_USER = 5;

export interface BrandProfile {
  id: string;
  name: string;
  niche: string;
  audience: string;
  tone: string;
  captionLength: "Short" | "Medium" | "Long";
  hashtagCount: number;
  imageStyle: string;
  primaryColor: string;
  secondaryColor: string;
  logoBase64?: string;
  website?: string;
  phone?: string;
  createdAt: string;
}

export async function getProfiles(userId: string): Promise<BrandProfile[]> {
  const rows = await sql`
    SELECT id, name, niche, audience, tone,
      caption_length as "captionLength",
      hashtag_count as "hashtagCount",
      image_style as "imageStyle",
      primary_color as "primaryColor",
      secondary_color as "secondaryColor",
      logo_base64 as "logoBase64",
      website,
      phone,
      created_at as "createdAt"
    FROM brand_profiles
    WHERE user_id = ${userId}
    ORDER BY created_at ASC
  `;
  return rows as BrandProfile[];
}

export async function createProfile(
  userId: string,
  profile: BrandProfile
): Promise<BrandProfile> {
  // Enforce max profiles
  const countRows = await sql`
    SELECT COUNT(*)::int as count FROM brand_profiles WHERE user_id = ${userId}
  `;
  const count = (countRows[0] as { count: number }).count;
  if (count >= MAX_PROFILES_PER_USER) {
    throw new Error("Maximum 5 profiles. Delete one to add more.");
  }

  await sql`
    INSERT INTO brand_profiles (
      id, user_id, name, niche, audience, tone,
      caption_length, hashtag_count, image_style,
      primary_color, secondary_color,
      logo_base64, website, phone,
      created_at, updated_at
    ) VALUES (
      ${profile.id},
      ${userId},
      ${profile.name},
      ${profile.niche},
      ${profile.audience},
      ${profile.tone},
      ${profile.captionLength},
      ${profile.hashtagCount},
      ${profile.imageStyle},
      ${profile.primaryColor},
      ${profile.secondaryColor},
      ${profile.logoBase64 ?? null},
      ${profile.website ?? ""},
      ${profile.phone ?? ""},
      ${profile.createdAt},
      NOW()
    )
  `;

  return profile;
}

export async function updateProfile(
  userId: string,
  profileId: string,
  updates: Partial<BrandProfile>
): Promise<BrandProfile | null> {
  // logo_base64: if provided (even "") → update (empty string becomes NULL); if absent → keep existing
  const shouldUpdateLogo = updates.logoBase64 !== undefined;
  const logoNewVal = shouldUpdateLogo ? (updates.logoBase64 || null) : null;

  await sql`
    UPDATE brand_profiles SET
      name = COALESCE(${updates.name ?? null}, name),
      niche = COALESCE(${updates.niche ?? null}, niche),
      audience = COALESCE(${updates.audience ?? null}, audience),
      tone = COALESCE(${updates.tone ?? null}, tone),
      caption_length = COALESCE(${updates.captionLength ?? null}, caption_length),
      hashtag_count = COALESCE(${updates.hashtagCount ?? null}, hashtag_count),
      image_style = COALESCE(${updates.imageStyle ?? null}, image_style),
      primary_color = COALESCE(${updates.primaryColor ?? null}, primary_color),
      secondary_color = COALESCE(${updates.secondaryColor ?? null}, secondary_color),
      logo_base64 = CASE WHEN ${shouldUpdateLogo} THEN ${logoNewVal} ELSE logo_base64 END,
      website = COALESCE(${updates.website ?? null}, website),
      phone = COALESCE(${updates.phone ?? null}, phone),
      updated_at = NOW()
    WHERE id = ${profileId} AND user_id = ${userId}
  `;

  // Return the updated profile
  const rows = await sql`
    SELECT id, name, niche, audience, tone,
      caption_length as "captionLength",
      hashtag_count as "hashtagCount",
      image_style as "imageStyle",
      primary_color as "primaryColor",
      secondary_color as "secondaryColor",
      logo_base64 as "logoBase64",
      website,
      phone,
      created_at as "createdAt"
    FROM brand_profiles
    WHERE id = ${profileId} AND user_id = ${userId}
  `;

  return (rows[0] as BrandProfile) || null;
}

export async function deleteProfile(
  userId: string,
  profileId: string
): Promise<void> {
  await sql`
    DELETE FROM brand_profiles
    WHERE id = ${profileId} AND user_id = ${userId}
  `;

  // Clear active profile if it was the deleted one
  await sql`
    DELETE FROM user_active_profile
    WHERE user_id = ${userId} AND profile_id = ${profileId}
  `;
}

export async function getActiveProfileId(
  userId: string
): Promise<string | null> {
  const rows = await sql`
    SELECT profile_id as "profileId"
    FROM user_active_profile
    WHERE user_id = ${userId}
  `;

  if (!rows[0]) return null;
  return (rows[0] as { profileId: string }).profileId;
}

export async function setActiveProfile(
  userId: string,
  profileId: string
): Promise<void> {
  await sql`
    INSERT INTO user_active_profile (user_id, profile_id, updated_at)
    VALUES (${userId}, ${profileId}, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      profile_id = ${profileId},
      updated_at = NOW()
  `;
}

export async function clearActiveProfile(userId: string): Promise<void> {
  await sql`
    DELETE FROM user_active_profile
    WHERE user_id = ${userId}
  `;
}
