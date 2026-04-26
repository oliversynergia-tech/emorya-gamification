INSERT INTO leaderboard_snapshots (id, user_id, period, xp, rank, snapshot_date)
SELECT
  gen_random_uuid(),
  sub.user_id,
  'referral',
  sub.referral_count,
  ROW_NUMBER() OVER (ORDER BY sub.referral_count DESC, sub.earliest_referral ASC),
  CURRENT_DATE
FROM (
  SELECT
    r.referrer_user_id AS user_id,
    COUNT(r.id)::int AS referral_count,
    MIN(r.created_at) AS earliest_referral
  FROM referrals r
  GROUP BY r.referrer_user_id
  HAVING COUNT(r.id) > 0
) sub
WHERE NOT EXISTS (
  SELECT 1
  FROM leaderboard_snapshots ls
  WHERE ls.user_id = sub.user_id
    AND ls.period = 'referral'
    AND ls.snapshot_date = CURRENT_DATE
);
