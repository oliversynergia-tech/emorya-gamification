UPDATE quest_definitions
SET
  title = 'Share your Emorya progress',
  description = 'Post your calorie conversion, streak, or reward progress on X to complete today''s social signal task.',
  updated_at = NOW()
WHERE id = '4b93f90c-cd8b-4297-bc7d-6f1ebf5293fa'
   OR slug = 'share-the-movement-reset';

UPDATE quest_definitions
SET
  slug = 'this-weeks-ugc-challenge',
  title = 'This week''s UGC challenge',
  description = 'Create and submit one polished piece of UGC about your Emorya progress, calorie journey, or reward momentum.',
  updated_at = NOW()
WHERE id = '8ec2112e-eebc-48dd-a32c-a2ca6c705c5a'
   OR slug = 'create-a-launch-meme';

UPDATE quest_definitions
SET
  slug = 'strengthen-the-core-30-day-hold',
  title = 'Strengthen the Core: 30-day stake hold',
  description = 'Maintain an EMR staking position for 30 days to unlock a major wallet and trust milestone.',
  xp_reward = 420,
  recurrence = 'monthly',
  metadata = '{"track":"wallet","walletCheckMode":"linked-wallet-ownership","requiredWalletPrefix":"erd","unlockRules":{"all":[{"type":"min_level","value":9},{"type":"wallet_linked","value":true},{"type":"subscription_tier","value":"monthly"},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":420,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":70}},"challengeConfig":{"durationDays":30},"previewConfig":{"label":"Wallet Rewards"}}'::jsonb,
  updated_at = NOW()
WHERE id = '76d48c0e-38b3-4087-8863-68d308ee60b8'
   OR slug = 'strengthen-the-core-7-day-hold';

UPDATE quest_definitions
SET
  slug = 'annual-referral-team-challenge',
  title = 'Annual referral team challenge',
  description = 'Bring in 3 qualified referrals this cycle to unlock your annual team reward bonus and token uplift.',
  updated_at = NOW()
WHERE id = '9e8dc739-f0d7-4ed5-b3a4-eb3ff7c8b6ed'
   OR slug = 'annual-team-reward-surge';

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
    '91fd3647-b4bd-4f18-aeb9-fc23254cf4a0',
    'fourteen-day-calorie-streak',
    '14-day calorie streak',
    'Convert 500 calories to EMRS for 14 consecutive days to prove a durable routine.',
    'app',
    900,
    'hard',
    'manual-review',
    'monthly',
    'free',
    7,
    FALSE,
    TRUE,
    '{"track":"daily","unlockRules":{"all":[{"type":"min_level","value":7}]},"submissionGuidance":{"evidence":["timestamped start screenshot","timestamped finish screenshot","daily calorie conversion proof"]},"rewardConfig":{"xp":{"base":900,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":110}},"challengeConfig":{"dailyCalorieTarget":500,"consecutiveDays":14}}'::jsonb
  ),
  (
    '0cf45bc5-66d8-46cb-a2aa-d8fcf0c86f03',
    'view-your-emrs-reward-path',
    'View your EMRS reward path',
    'Open your EMRS reward path and review how calorie conversions, streaks, and wallet actions turn into reward eligibility.',
    'learn',
    40,
    'easy',
    'link-visit',
    'one-time',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/emrs-reward-path","unlockRules":{"all":[{"type":"min_level","value":3}]},"rewardConfig":{"xp":{"base":40,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}}}'::jsonb
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
