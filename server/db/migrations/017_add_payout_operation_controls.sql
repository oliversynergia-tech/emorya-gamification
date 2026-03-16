ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS payout_mode TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS settlement_processing_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS direct_reward_queue_enabled BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS settlement_notes_required BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name = 'economy_settings'
      AND constraint_name = 'economy_settings_payout_mode_check'
  ) THEN
    ALTER TABLE economy_settings
      ADD CONSTRAINT economy_settings_payout_mode_check
      CHECK (payout_mode IN ('manual', 'review_required', 'automation_ready'));
  END IF;
END $$;
