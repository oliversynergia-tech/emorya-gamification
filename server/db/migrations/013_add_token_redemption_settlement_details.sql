ALTER TABLE token_redemptions
  ADD COLUMN IF NOT EXISTS settled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS receipt_reference TEXT,
  ADD COLUMN IF NOT EXISTS settlement_note TEXT;
