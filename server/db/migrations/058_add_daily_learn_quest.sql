INSERT INTO quest_definitions (
  id,
  slug,
  title,
  description,
  category,
  xp_reward,
  difficulty,
  verification_type,
  recurrence,
  required_tier,
  required_level,
  is_premium_preview,
  is_active,
  metadata
) VALUES
  (
    'f53ec235-3fba-4517-ae82-8d35f4f7ccff',
    'daily-emorya-tip',
    'Daily Emorya tip',
    'Read today''s Emorya tip and confirm you''ve seen it to keep your learning streak active.',
    'learn',
    15,
    'easy',
    'link-visit',
    'daily',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"/tips","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":15,"premiumMultiplierEligible":true},"tokenEffect":"none"},"questPortability":"emorya_only"}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  xp_reward = EXCLUDED.xp_reward,
  difficulty = EXCLUDED.difficulty,
  verification_type = EXCLUDED.verification_type,
  recurrence = EXCLUDED.recurrence,
  required_tier = EXCLUDED.required_tier,
  required_level = EXCLUDED.required_level,
  is_premium_preview = EXCLUDED.is_premium_preview,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();

UPDATE quest_definitions
SET metadata = metadata || '{"questPortability":"emorya_only"}'::jsonb,
    updated_at = NOW()
WHERE slug IN ('daily-emorya-tip');
