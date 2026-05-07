import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

export async function DELETE() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Delete all user data from every table before removing the Clerk account.
  // Order matters — delete child/dependent rows first.
  await Promise.all([
    sql`DELETE FROM user_tokens         WHERE user_id        = ${userId}`,
    sql`DELETE FROM user_entitlements   WHERE clerk_user_id  = ${userId}`,
    sql`DELETE FROM user_active_profile WHERE user_id        = ${userId}`,
    sql`DELETE FROM instagram_accounts  WHERE user_id        = ${userId}`,
    sql`DELETE FROM facebook_pages      WHERE user_id        = ${userId}`,
    sql`DELETE FROM device_tokens       WHERE user_id        = ${userId}`,
    sql`DELETE FROM scheduled_posts     WHERE user_id        = ${userId}`,
    sql`DELETE FROM saved_posts         WHERE user_id        = ${userId}`,
    sql`DELETE FROM media_assets        WHERE user_id        = ${userId}`,
    sql`DELETE FROM brand_profiles      WHERE user_id        = ${userId}`,
  ]);

  const client = await clerkClient();
  await client.users.deleteUser(userId);

  return NextResponse.json({ success: true });
}
