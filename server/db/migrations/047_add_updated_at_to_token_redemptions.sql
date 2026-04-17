ALTER TABLE token_redemptions
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

UPDATE token_redemptions
SET updated_at = COALESCE(updated_at, settled_at, created_at, NOW())
WHERE updated_at IS NULL;

ALTER TABLE token_redemptions
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE token_redemptions
  ALTER COLUMN updated_at SET NOT NULL;
