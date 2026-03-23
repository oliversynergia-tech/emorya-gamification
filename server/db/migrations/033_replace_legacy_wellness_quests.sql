UPDATE quest_definitions
SET
  slug = 'play-emoryan-adventure-game',
  title = 'Play Emoryan Adventure Game',
  description = 'Open the Emoryan Adventure Game and complete one run to keep your daily momentum active.',
  category = 'app',
  xp_reward = 30,
  difficulty = 'easy',
  verification_type = 'link-visit',
  recurrence = 'daily',
  required_tier = 'free',
  required_level = 1,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"daily","targetUrl":"https://example.com/emoryan-adventure","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE id = '7cc727ca-e6eb-4bb1-917d-ef9b6d9bf9bd'
   OR slug = 'daily-recovery-check-in';

UPDATE quest_definitions
SET
  slug = 'complete-daily-wheel-spin',
  title = 'Complete your Daily Wheel Spin',
  description = 'Open the daily wheel and finish one spin to keep your reward rhythm moving.',
  category = 'app',
  xp_reward = 35,
  difficulty = 'easy',
  verification_type = 'link-visit',
  recurrence = 'daily',
  required_tier = 'free',
  required_level = 2,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"daily","targetUrl":"https://example.com/daily-wheel","unlockRules":{"all":[{"type":"min_level","value":2}]},"rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}}}'::jsonb,
  updated_at = NOW()
WHERE id = 'ef257868-6d9d-4fcf-9ce9-3ee1920548e4'
   OR slug = 'hydration-reset-week';
