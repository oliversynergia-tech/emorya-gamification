UPDATE quest_definitions
SET
  slug = 'create-emorya-account',
  title = 'Create Emorya account',
  description = 'Create your Emorya account so your quest path, rewards, and calorie journey can begin.',
  category = 'app',
  xp_reward = 30,
  difficulty = 'easy',
  verification_type = 'link-visit',
  recurrence = 'one-time',
  required_tier = 'free',
  required_level = 1,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/create-account","_urlNote":"PENDING: Need Emorya app deep link to the account creation screen.","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE id = 'ca8d9fdd-aa13-4e69-8ae7-615f7a2a0f83'
   OR slug = 'complete-welcome-setup';

UPDATE quest_definitions
SET
  slug = 'connect-your-xportal-wallet',
  title = 'Connect your XPortal Wallet',
  description = 'Connect your xPortal wallet so EMRS rewards and calorie-linked progress can settle correctly.',
  category = 'learn',
  xp_reward = 35,
  difficulty = 'easy',
  verification_type = 'link-visit',
  recurrence = 'one-time',
  required_tier = 'free',
  required_level = 1,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"wallet","targetUrl":"https://xportal.com","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}}}'::jsonb,
  updated_at = NOW()
WHERE id = '5a425a67-b7ab-4bca-9629-a90a507663e5'
   OR slug = 'open-the-xportal-setup-guide';

UPDATE quest_definitions
SET
  slug = 'convert-your-first-calories',
  title = 'Convert your first calories',
  description = 'Complete your first calorie conversion so the EMRS reward loop starts with a verified first win.',
  category = 'app',
  xp_reward = 45,
  difficulty = 'easy',
  verification_type = 'manual-review',
  recurrence = 'one-time',
  required_tier = 'free',
  required_level = 2,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"starter","unlockRules":{"all":[{"type":"min_level","value":2}]},"submissionGuidance":{"evidence":["first calorie conversion screenshot"]},"rewardConfig":{"xp":{"base":45,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}},"challengeConfig":{"firstConversion":true}}'::jsonb,
  updated_at = NOW()
WHERE id = 'c90f8fab-a89d-41cc-ad69-73527891e7e2'
   OR slug = 'connect-your-first-community-channel';
