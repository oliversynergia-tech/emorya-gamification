CREATE TABLE IF NOT EXISTS token_redemptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset TEXT NOT NULL CHECK (asset IN ('EMR', 'EGLD', 'PARTNER')),
  eligibility_points_spent INTEGER NOT NULL DEFAULT 0,
  token_amount NUMERIC(18, 4) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('claimed', 'settled')),
  source TEXT NOT NULL DEFAULT 'xp-conversion',
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_token_redemptions_user_id
  ON token_redemptions(user_id, created_at DESC);
