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
    '3ed24320-55f4-4a2e-b9a1-d54d30931b17',
    'log-todays-calorie-burn',
    'Log today''s calorie burn',
    'Submit a screenshot of your daily calorie burn from the Emorya app to keep your daily momentum active.',
    'app',
    50,
    'easy',
    'manual-review',
    'daily',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"daily","unlockRules":{"all":[{"type":"min_level","value":2},{"type":"quest_completed","value":"confirm-your-starter-setup"}]},"submissionGuidance":{"evidence":["daily calorie burn screenshot from the Emorya app"]},"rewardConfig":{"xp":{"base":50,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}},"challengeConfig":{"dailyCalorieLog":true},"questPortability":"emorya_only"}'::jsonb
  ),
  (
    '2cf0dce0-1952-4d8a-9995-e149a16aa38d',
    'hit-daily-200-calorie-target',
    'Hit your daily 200 calorie target',
    'Burn at least 200 calories today and submit a screenshot showing you hit the target.',
    'app',
    40,
    'easy',
    'manual-review',
    'daily',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"daily","unlockRules":{"all":[{"type":"min_level","value":2},{"type":"quest_completed","value":"confirm-your-starter-setup"}]},"submissionGuidance":{"evidence":["screenshot showing 200+ calories burned today in the Emorya app"]},"rewardConfig":{"xp":{"base":40,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}},"challengeConfig":{"dailyCalorieTarget":200},"questPortability":"emorya_only"}'::jsonb
  ),
  (
    '806d5e79-a695-4035-9c3f-82051c5566c3',
    'check-your-emrs-balance',
    'Check your EMRS balance',
    'Open your EMRS reward balance to stay connected to your progression and reward momentum.',
    'app',
    15,
    'easy',
    'link-visit',
    'daily',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"daily","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/emrs-balance","_urlNote":"PENDING: Need Emorya app deep link to the EMRS reward balance screen.","unlockRules":{"all":[{"type":"min_level","value":2}]},"rewardConfig":{"xp":{"base":15,"premiumMultiplierEligible":true},"tokenEffect":"none"},"questPortability":"emorya_only"}'::jsonb
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
SET is_active = FALSE,
    updated_at = NOW()
WHERE slug = 'visit-premium-explainer'
  AND is_active = TRUE;

UPDATE quest_definitions
SET metadata = metadata || '{"questPortability":"emorya_only"}'::jsonb,
    updated_at = NOW()
WHERE slug IN (
  'log-todays-calorie-burn',
  'hit-daily-200-calorie-target',
  'check-your-emrs-balance'
);
