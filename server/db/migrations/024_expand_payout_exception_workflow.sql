ALTER TABLE token_redemptions
  DROP CONSTRAINT IF EXISTS token_redemptions_workflow_state_check;

ALTER TABLE token_redemptions
  ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS held_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS hold_reason TEXT,
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE token_redemptions
  ADD CONSTRAINT token_redemptions_workflow_state_check
  CHECK (workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled'));

ALTER TABLE token_redemption_audit
  DROP CONSTRAINT IF EXISTS token_redemption_audit_action_check,
  DROP CONSTRAINT IF EXISTS token_redemption_audit_previous_workflow_state_check,
  DROP CONSTRAINT IF EXISTS token_redemption_audit_next_workflow_state_check;

ALTER TABLE token_redemption_audit
  ADD CONSTRAINT token_redemption_audit_action_check
  CHECK (action IN ('approve', 'processing', 'settle', 'hold', 'fail', 'requeue', 'cancel'));

ALTER TABLE token_redemption_audit
  ADD CONSTRAINT token_redemption_audit_previous_workflow_state_check
  CHECK (previous_workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled'));

ALTER TABLE token_redemption_audit
  ADD CONSTRAINT token_redemption_audit_next_workflow_state_check
  CHECK (next_workflow_state IN ('queued', 'approved', 'processing', 'held', 'failed', 'cancelled', 'settled'));
