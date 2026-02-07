-- Database schema for AI Tech Helper subscriptions
-- Run this in your Neon Postgres console

CREATE TABLE IF NOT EXISTS user_entitlements (
  clerk_user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due')),
  plan TEXT CHECK (plan IN ('monthly', 'yearly')),
  current_period_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for faster lookups by stripe customer id
CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_customer_id ON user_entitlements(stripe_customer_id);

-- Index for faster lookups by stripe subscription id
CREATE INDEX IF NOT EXISTS idx_user_entitlements_stripe_subscription_id ON user_entitlements(stripe_subscription_id);

-- Token usage tracking
CREATE TABLE IF NOT EXISTS user_tokens (
  user_id TEXT PRIMARY KEY,
  month_key TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0,
  allowance INTEGER NOT NULL DEFAULT 60,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
