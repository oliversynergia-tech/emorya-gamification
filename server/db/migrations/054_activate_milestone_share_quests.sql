CREATE TABLE IF NOT EXISTS runtime_flags (
  flag_key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO runtime_flags (flag_key, enabled)
VALUES ('milestone_share_enabled', TRUE)
ON CONFLICT (flag_key) DO UPDATE
SET enabled = TRUE,
    updated_at = NOW();

UPDATE quest_definitions
SET is_active = TRUE,
    updated_at = NOW()
WHERE slug IN (
  'share-first-calorie-conversion-celebration',
  'share-your-7-day-streak-win',
  'share-your-referral-signup-win',
  'share-your-premium-unlock',
  'share-your-marathon-completion'
)
AND is_active = FALSE;

UPDATE quest_definitions
SET metadata = metadata || '{"rewardConfig":{"xp":{"base":140,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-first-calorie-conversion-celebration';

UPDATE quest_definitions
SET metadata = metadata || '{"rewardConfig":{"xp":{"base":220,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-your-7-day-streak-win';

UPDATE quest_definitions
SET metadata = metadata || '{"rewardConfig":{"xp":{"base":160,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-your-referral-signup-win';

UPDATE quest_definitions
SET metadata = metadata || '{"rewardConfig":{"xp":{"base":260,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-your-premium-unlock';

UPDATE quest_definitions
SET metadata = metadata || '{"rewardConfig":{"xp":{"base":420,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-your-marathon-completion';
