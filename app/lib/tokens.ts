import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

const DEFAULT_MONTHLY_TOKENS = 60;

function getMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getAllowance(): number {
  return parseInt(process.env.MONTHLY_TOKENS ?? String(DEFAULT_MONTHLY_TOKENS), 10);
}

export interface TokenStatus {
  allowance: number;
  used: number;
  remaining: number;
}

export async function getTokenStatus(userId: string): Promise<TokenStatus> {
  const currentMonth = getMonthKey();
  const allowance = getAllowance();

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
    return { allowance, used: 0, remaining: allowance };
  }

  const row = rows[0] as { used: number; monthKey: string; allowance: number };

  // Lazy monthly reset
  if (row.monthKey !== currentMonth) {
    await sql`
      UPDATE user_tokens
      SET used = 0, month_key = ${currentMonth}, allowance = ${allowance}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    return { allowance, used: 0, remaining: allowance };
  }

  return { allowance: row.allowance, used: row.used, remaining: row.allowance - row.used };
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

  return { allowance: status.allowance, used: status.used + 1, remaining: status.remaining - 1 };
}
