CREATE TABLE IF NOT EXISTS token_redemption_audit (
  id UUID PRIMARY KEY,
  redemption_id UUID NOT NULL REFERENCES token_redemptions(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approve', 'processing', 'settle')),
  changed_by UUID REFERENCES users(id),
  previous_workflow_state TEXT NOT NULL CHECK (previous_workflow_state IN ('queued', 'approved', 'processing', 'settled')),
  next_workflow_state TEXT NOT NULL CHECK (next_workflow_state IN ('queued', 'approved', 'processing', 'settled')),
  receipt_reference TEXT,
  settlement_note TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_token_redemption_audit_created_at
  ON token_redemption_audit(created_at DESC);
