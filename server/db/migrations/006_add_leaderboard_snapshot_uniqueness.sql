DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'leaderboard_snapshots_user_period_date_key'
  ) THEN
    ALTER TABLE leaderboard_snapshots
    ADD CONSTRAINT leaderboard_snapshots_user_period_date_key
    UNIQUE (user_id, period, snapshot_date);
  END IF;
END $$;
