import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

const PLAN_ALLOWANCES: Record<string, number> = {
  free: 10,
  basic: 30,
  pro: 60,
  premium: 120,
};

const FREE_ALLOWANCE = PLAN_ALLOWANCES.free;

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

async function getAllowanceForUser(userId: string): Promise<{ allowance: number; plan: string | null }> {
  const rows = await sql`
    SELECT subscription_status as "subscriptionStatus", plan
    FROM user_entitlements
    WHERE clerk_user_id = ${userId}
  `;

  // No entitlement row — auto-enroll in free plan on first access
  if (!rows[0]) {
    await sql`
      INSERT INTO user_entitlements (clerk_user_id, subscription_status, plan, updated_at)
      VALUES (${userId}, 'active', 'free', NOW())
      ON CONFLICT (clerk_user_id) DO NOTHING
    `;
    return { allowance: FREE_ALLOWANCE, plan: "free" };
  }

  const row = rows[0] as { subscriptionStatus: string; plan: string | null };

  if (row.subscriptionStatus !== "active") return { allowance: FREE_ALLOWANCE, plan: row.plan };

  // Active subscription — look up plan, default to pro (60) if null/unknown
  const planKey = (row.plan || "").toLowerCase();
  return { allowance: PLAN_ALLOWANCES[planKey] ?? PLAN_ALLOWANCES.pro, plan: row.plan };
}

export interface TokenStatus {
  allowance: number;
  used: number;
  remaining: number;
  /** The user's current plan key ("free", "basic", "pro", "premium"), or null if they have never selected any plan. */
  plan: string | null;
}

export async function getTokenStatus(userId: string): Promise<TokenStatus> {
  const currentMonth = getMonthKey();
  const { allowance, plan } = await getAllowanceForUser(userId);

  const rows = await sql`
    SELECT used, month_key as "monthKey", allowance
    FROM user_tokens
    WHERE user_id = ${userId}
  `;

  // No row yet — new user
  if (!rows[0]) {
    await sql`
      INSERT INTO user_tokens (user_id, month_key, used, allowance, updated_at)
      VALUES (${userId}, ${currentMonth}, 0, ${allowance}, NOW())
    `;
    return { allowance, used: 0, remaining: allowance, plan };
  }

  const row = rows[0] as { used: number; monthKey: string; allowance: number };

  // Lazy monthly reset
  if (row.monthKey !== currentMonth) {
    await sql`
      UPDATE user_tokens
      SET used = 0, month_key = ${currentMonth}, allowance = ${allowance}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    return { allowance, used: 0, remaining: allowance, plan };
  }

  // Sync allowance if plan changed mid-month (e.g. upgrade/downgrade or leaving test mode)
  if (row.allowance !== allowance) {
    // On upgrade, reset usage so the user starts fresh on their new plan.
    // On downgrade, preserve usage (remaining is just clamped to the lower allowance).
    const isUpgrade = allowance > row.allowance;
    const newUsed = isUpgrade ? 0 : row.used;
    await sql`
      UPDATE user_tokens
      SET allowance = ${allowance}, used = ${newUsed}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    return { allowance, used: newUsed, remaining: allowance - newUsed, plan };
  }

  return { allowance: row.allowance, used: row.used, remaining: row.allowance - row.used, plan };
}

export async function useToken(userId: string): Promise<TokenStatus> {
  const status = await getTokenStatus(userId);
  if (status.remaining <= 0) {
    return status;
  }

  await sql`
    UPDATE user_tokens
    SET used = used + 1, updated_at = NOW()
    WHERE user_id = ${userId}
  `;

  return { allowance: status.allowance, used: status.used + 1, remaining: status.remaining - 1, plan: status.plan };
}
