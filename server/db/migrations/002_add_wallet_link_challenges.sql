CREATE TABLE IF NOT EXISTS wallet_link_challenges (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  nonce TEXT NOT NULL,
  challenge_message TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  consumed_at TIMESTAMPTZ,
  UNIQUE (user_id, wallet_address, nonce)
);

CREATE INDEX IF NOT EXISTS idx_wallet_link_challenges_user_id
  ON wallet_link_challenges(user_id, created_at DESC);
