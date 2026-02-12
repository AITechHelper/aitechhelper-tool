-- Database schema for AI Tech Helper subscriptions
-- Run this in your Neon Postgres console

CREATE TABLE IF NOT EXISTS user_entitlements (
  clerk_user_id TEXT PRIMARY KEY,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  subscription_status TEXT NOT NULL DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due')),
  plan TEXT CHECK (plan IN ('basic', 'pro', 'premium')),
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
  allowance INTEGER NOT NULL DEFAULT 45,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Brand profiles for users
CREATE TABLE IF NOT EXISTS brand_profiles (
  id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  niche TEXT NOT NULL DEFAULT '',
  audience TEXT NOT NULL DEFAULT '',
  tone TEXT NOT NULL DEFAULT 'Confident',
  caption_length TEXT NOT NULL DEFAULT 'Medium' CHECK (caption_length IN ('Short', 'Medium', 'Long')),
  hashtag_count INTEGER NOT NULL DEFAULT 12,
  image_style TEXT NOT NULL DEFAULT 'lifestyle_photo',
  primary_color TEXT NOT NULL DEFAULT '#000000',
  secondary_color TEXT NOT NULL DEFAULT '#ffffff',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_brand_profiles_user_id ON brand_profiles(user_id);

-- Active profile selection per user
CREATE TABLE IF NOT EXISTS user_active_profile (
  user_id TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Instagram account connections
CREATE TABLE IF NOT EXISTS instagram_accounts (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  instagram_user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  access_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, instagram_user_id)
);

CREATE INDEX IF NOT EXISTS idx_instagram_accounts_user_id ON instagram_accounts(user_id);

-- Facebook page connections
CREATE TABLE IF NOT EXISTS facebook_pages (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  page_id TEXT NOT NULL,
  page_name TEXT NOT NULL,
  page_access_token TEXT NOT NULL,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_user_id ON facebook_pages(user_id);
