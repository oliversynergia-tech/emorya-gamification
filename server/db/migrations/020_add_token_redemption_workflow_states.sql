ALTER TABLE token_redemptions
  ADD COLUMN IF NOT EXISTS workflow_state TEXT NOT NULL DEFAULT 'queued'
    CHECK (workflow_state IN ('queued', 'approved', 'processing', 'settled')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS processing_by UUID REFERENCES users(id);

UPDATE token_redemptions
SET workflow_state = CASE
  WHEN status = 'settled' THEN 'settled'
  ELSE 'queued'
END
WHERE workflow_state IS NULL
   OR workflow_state = 'queued';
