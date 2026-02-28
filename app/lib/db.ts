import { neon } from "@neondatabase/serverless";

let _sql: ReturnType<typeof neon> | null = null;
function sql(strings: TemplateStringsArray, ...values: any[]): Promise<any[]> {
  if (!_sql) _sql = neon(process.env.DATABASE_URL!);
  return (_sql as any)(strings, ...values);
}

export type SubscriptionStatus = "active" | "inactive" | "past_due";
export type Plan = "basic" | "pro" | "premium";

export interface UserEntitlement {
  clerkUserId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus;
  plan: Plan | null;
  currentPeriodEnd: Date | null;
  updatedAt: Date;
}

export async function getUserEntitlement(
  clerkUserId: string
): Promise<UserEntitlement | null> {
  const rows = await sql`
    SELECT
      clerk_user_id as "clerkUserId",
      stripe_customer_id as "stripeCustomerId",
      stripe_subscription_id as "stripeSubscriptionId",
      subscription_status as "subscriptionStatus",
      plan,
      current_period_end as "currentPeriodEnd",
      updated_at as "updatedAt"
    FROM user_entitlements
    WHERE clerk_user_id = ${clerkUserId}
  `;
  return (rows[0] as UserEntitlement) || null;
}

export async function upsertUserEntitlement(
  data: Partial<UserEntitlement> & { clerkUserId: string }
): Promise<void> {
  const {
    clerkUserId,
    stripeCustomerId,
    stripeSubscriptionId,
    subscriptionStatus,
    plan,
    currentPeriodEnd,
  } = data;

  await sql`
    INSERT INTO user_entitlements (
      clerk_user_id,
      stripe_customer_id,
      stripe_subscription_id,
      subscription_status,
      plan,
      current_period_end,
      updated_at
    ) VALUES (
      ${clerkUserId},
      ${stripeCustomerId ?? null},
      ${stripeSubscriptionId ?? null},
      ${subscriptionStatus ?? "inactive"},
      ${plan ?? null},
      ${currentPeriodEnd ?? null},
      NOW()
    )
    ON CONFLICT (clerk_user_id) DO UPDATE SET
      stripe_customer_id = COALESCE(EXCLUDED.stripe_customer_id, user_entitlements.stripe_customer_id),
      stripe_subscription_id = COALESCE(EXCLUDED.stripe_subscription_id, user_entitlements.stripe_subscription_id),
      subscription_status = COALESCE(EXCLUDED.subscription_status, user_entitlements.subscription_status),
      plan = COALESCE(EXCLUDED.plan, user_entitlements.plan),
      current_period_end = COALESCE(EXCLUDED.current_period_end, user_entitlements.current_period_end),
      updated_at = NOW()
  `;
}

export async function updateSubscriptionStatus(
  stripeSubscriptionId: string,
  subscriptionStatus: SubscriptionStatus,
  currentPeriodEnd?: Date
): Promise<void> {
  await sql`
    UPDATE user_entitlements
    SET
      subscription_status = ${subscriptionStatus},
      current_period_end = COALESCE(${currentPeriodEnd ?? null}, current_period_end),
      updated_at = NOW()
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
  `;
}

export async function getEntitlementByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserEntitlement | null> {
  const rows = await sql`
    SELECT
      clerk_user_id as "clerkUserId",
      stripe_customer_id as "stripeCustomerId",
      stripe_subscription_id as "stripeSubscriptionId",
      subscription_status as "subscriptionStatus",
      plan,
      current_period_end as "currentPeriodEnd",
      updated_at as "updatedAt"
    FROM user_entitlements
    WHERE stripe_customer_id = ${stripeCustomerId}
  `;
  return (rows[0] as UserEntitlement) || null;
}
