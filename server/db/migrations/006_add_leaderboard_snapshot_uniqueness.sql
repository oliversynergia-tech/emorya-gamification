ALTER TABLE leaderboard_snapshots
ADD CONSTRAINT leaderboard_snapshots_user_period_date_key
UNIQUE (user_id, period, snapshot_date);
