UPDATE quest_definitions
SET
  slug = 'share-your-verified-progress-screenshot',
  title = 'Share your verified progress screenshot',
  description = 'Post a real Emorya progress screenshot on X and submit the link.',
  xp_reward = 90,
  difficulty = 'medium',
  verification_type = 'manual-review',
  recurrence = 'weekly',
  required_level = 3,
  metadata = '{"track":"social","unlockRules":{"all":[{"type":"min_level","value":3}]},"submissionGuidance":{"evidence":["public post link","progress screenshot"]},"rewardConfig":{"xp":{"base":90,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE id = '4b93f90c-cd8b-4297-bc7d-6f1ebf5293fa'
   OR slug = 'share-the-movement-reset';

UPDATE quest_definitions
SET is_active = FALSE, updated_at = NOW()
WHERE id IN (
  '4cbda570-89a7-4c9d-bcdc-3e482ed02ae3',
  'd19f442f-3b81-454c-aa94-6f33b7524d59',
  '91fd3647-b4bd-4f18-aeb9-fc23254cf4a0',
  'df10d884-7c1a-403d-9bd5-aeb4ee7f95a4',
  'b2e73062-4fa1-4ed7-af5c-f5d75c9f1103',
  '75d12a7a-c326-4fb5-9af4-fec69f04ccab',
  '59a8048b-8c8a-4f7a-b383-a08cf69ee6d4',
  '76d48c0e-38b3-4087-8863-68d308ee60b8',
  '2833c51d-e8f6-49d2-8c38-f4fd032f6af7'
);

UPDATE quest_definitions
SET
  xp_reward = 60,
  metadata = '{"track":"starter","targetUrl":"https://example.com/create-account","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":60,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE id = 'ca8d9fdd-aa13-4e69-8ae7-615f7a2a0f83'
   OR slug = 'create-emorya-account';

UPDATE quest_definitions
SET
  xp_reward = 80,
  required_level = 2,
  metadata = '{"track":"wallet","targetUrl":"https://example.com/connect-xportal-wallet","unlockRules":{"all":[{"type":"min_level","value":2}]},"rewardConfig":{"xp":{"base":80,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}}}'::jsonb,
  updated_at = NOW()
WHERE id = '5a425a67-b7ab-4bca-9629-a90a507663e5'
   OR slug = 'connect-your-xportal-wallet';

UPDATE quest_definitions
SET
  xp_reward = 90,
  required_level = 3,
  metadata = '{"track":"starter","unlockRules":{"all":[{"type":"min_level","value":3}]},"submissionGuidance":{"evidence":["first calorie conversion screenshot"]},"rewardConfig":{"xp":{"base":90,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}},"challengeConfig":{"firstConversion":true}}'::jsonb,
  updated_at = NOW()
WHERE id = 'c90f8fab-a89d-41cc-ad69-73527891e7e2'
   OR slug = 'convert-your-first-calories';

UPDATE quest_definitions
SET
  slug = 'invite-your-first-accountability-partner',
  title = 'Invite your first accountability partner',
  description = 'Invite one friend to join you on Emorya as an accountability partner.',
  xp_reward = 80,
  recurrence = 'one-time',
  required_level = 3,
  metadata = '{"track":"referral","targetUrl":"https://example.com/accountability-partner","unlockRules":{"all":[{"type":"min_level","value":3}]},"rewardConfig":{"xp":{"base":80,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE id = '3275f8ca-13cd-4297-94fc-f0f45458d225'
   OR slug = 'send-your-first-referral-wave';

UPDATE quest_definitions
SET
  slug = 'refer-one-user-who-converts-calories',
  title = 'Refer one user who converts calories',
  description = 'Refer one user who completes their first verified calorie conversion.',
  xp_reward = 180,
  recurrence = 'monthly',
  metadata = '{"track":"referral","targetUrl":"https://example.com/referral-conversion","unlockRules":{"all":[{"type":"min_level","value":4},{"type":"successful_referrals","value":1}]},"rewardConfig":{"xp":{"base":180,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":40}}}'::jsonb,
  updated_at = NOW()
WHERE id = '0baa67a0-0d57-42fd-87e5-d77052986842'
   OR slug = 'three-friend-momentum-push';

UPDATE quest_definitions
SET
  slug = 'upgrade-to-premium-monthly',
  title = 'Upgrade to Premium Monthly',
  description = 'Unlock Premium Monthly to access stronger rewards, better momentum, and premium-only progression.',
  xp_reward = 350,
  recurrence = 'one-time',
  required_tier = 'free',
  required_level = 3,
  is_premium_preview = FALSE,
  metadata = '{"track":"premium","targetUrl":"https://example.com/upgrade-monthly","unlockRules":{"all":[{"type":"min_level","value":3},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":350,"premiumMultiplierEligible":false},"tokenEffect":"token_bonus","tokenBonus":{"multiplier":1.3}}}'::jsonb,
  updated_at = NOW()
WHERE id = '379b37d0-8cdd-4e93-95bc-f8b1b5a6afe0'
   OR slug = 'monthly-momentum-sprint';

UPDATE quest_definitions
SET
  xp_reward = 160,
  required_level = 5,
  metadata = '{"track":"creative","unlockRules":{"all":[{"type":"min_level","value":5}]},"rewardConfig":{"xp":{"base":160,"premiumMultiplierEligible":true},"tokenEffect":"none"},"cooldownHours":48}'::jsonb,
  updated_at = NOW()
WHERE id = '8ec2112e-eebc-48dd-a32c-a2ca6c705c5a'
   OR slug = 'this-weeks-ugc-challenge';

UPDATE quest_definitions
SET
  slug = 'upgrade-to-annual',
  title = 'Upgrade to Annual',
  description = 'Upgrade to an annual plan to unlock the strongest loyalty rewards, premium access, and annual-only bonus pathways.',
  xp_reward = 1200,
  difficulty = 'medium',
  recurrence = 'one-time',
  required_tier = 'free',
  required_level = 5,
  is_premium_preview = FALSE,
  metadata = '{"track":"premium","targetUrl":"https://example.com/upgrade-annual","unlockRules":{"all":[{"type":"min_level","value":5},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":1200,"premiumMultiplierEligible":false},"tokenEffect":"direct_token_reward","directTokenReward":{"asset":"EMR","amount":25,"requiresWallet":true}},"annualBonus":{"stakedEmrBase":25,"perConvertedReferral":10}}'::jsonb,
  updated_at = NOW()
WHERE id = '9e8dc739-f0d7-4ed5-b3a4-eb3ff7c8b6ed'
   OR slug = 'annual-referral-team-challenge';

UPDATE quest_definitions
SET
  required_level = 2,
  metadata = '{"track":"starter","targetUrl":"https://example.com/emrs-reward-path","unlockRules":{"all":[{"type":"min_level","value":2}]},"rewardConfig":{"xp":{"base":40,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}}}'::jsonb,
  updated_at = NOW()
WHERE id = '0cf45bc5-66d8-46cb-a2aa-d8fcf0c86f03'
   OR slug = 'view-your-emrs-reward-path';

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
    '52b11fa2-0bd4-45cb-b7aa-9d3947a01f34',
    'join-emorya-telegram',
    'Join Emorya Telegram',
    'Join the Emorya Telegram community and submit proof that you''re in.',
    'social',
    20,
    'easy',
    'social-oauth',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/join-telegram","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":20,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '42011d57-13d1-4d3c-8cbf-af9db7f693b8',
    'join-emorya-discord',
    'Join Emorya Discord',
    'Join the Emorya Discord server and confirm your entry.',
    'social',
    20,
    'easy',
    'social-oauth',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/join-discord","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":20,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '7c8f4788-f2dd-45ad-a150-7f5957d4dd7f',
    'follow-emorya-on-x',
    'Follow Emorya on X',
    'Follow Emorya on X and submit proof of follow.',
    'social',
    20,
    'easy',
    'social-oauth',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/follow-x","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":20,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'a96ee831-911f-4e15-86db-e8bbf8eb8a90',
    'like-this-weeks-emorya-post',
    'Like this week''s Emorya post',
    'Like the featured Emorya post for this week and submit the post link.',
    'social',
    15,
    'easy',
    'manual-review',
    'weekly',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/weekly-post","unlockRules":{"all":[]},"submissionGuidance":{"evidence":["post link"]},"rewardConfig":{"xp":{"base":15,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '8738e1e6-18d7-4f6f-85fe-860a4f14b0b1',
    'share-an-emorya-post',
    'Share an Emorya post',
    'Share or repost an Emorya post to your audience and submit proof.',
    'social',
    35,
    'easy',
    'manual-review',
    'weekly',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/share-post","unlockRules":{"all":[{"type":"min_level","value":2}]},"submissionGuidance":{"evidence":["shared post link"]},"rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'ec56aab7-6330-4dce-8687-f1a519b7c4d6',
    'download-the-emorya-app',
    'Download the Emorya app',
    'Download the Emorya app and confirm installation.',
    'app',
    40,
    'easy',
    'manual-review',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/download-app","unlockRules":{"all":[]},"submissionGuidance":{"evidence":["app install screenshot"]},"rewardConfig":{"xp":{"base":40,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'd6f49297-0d44-49d4-a0f4-4f8da7fd59d7',
    'open-the-app-for-the-first-time',
    'Open the app for the first time',
    'Launch the Emorya app and enter your first active session.',
    'app',
    30,
    'easy',
    'link-visit',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/open-app","unlockRules":{"all":[]},"rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'bc875346-df7c-4e85-b5d6-67065be56c6b',
    'rate-emorya-on-the-app-store',
    'Rate Emorya on the App Store',
    'Leave a genuine rating for Emorya on the App Store after using the app.',
    'social',
    60,
    'easy',
    'manual-review',
    'one-time',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/app-store-rating","unlockRules":{"all":[{"type":"min_level","value":3}]},"submissionGuidance":{"evidence":["rating confirmation screenshot"]},"rewardConfig":{"xp":{"base":60,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '7f53ce74-c4da-4d4c-a968-d39b442a7e7e',
    'leave-your-first-emorya-review',
    'Leave your first Emorya review',
    'Write a real review of your Emorya experience and submit proof.',
    'social',
    120,
    'medium',
    'manual-review',
    'one-time',
    'free',
    4,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/app-store-review","unlockRules":{"all":[{"type":"min_level","value":4}]},"submissionGuidance":{"evidence":["review screenshot","review text excerpt"]},"rewardConfig":{"xp":{"base":120,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '1ec4b47a-905b-444a-a0c9-8021f5b7bda8',
    'create-an-emorya-progress-reel',
    'Create an Emorya progress reel',
    'Make a short-form video showing your Emorya progress or streak milestone.',
    'creative',
    220,
    'medium',
    'manual-review',
    'weekly',
    'free',
    6,
    FALSE,
    TRUE,
    '{"track":"creative","unlockRules":{"all":[{"type":"min_level","value":6}]},"submissionGuidance":{"evidence":["video link","cover screenshot"]},"rewardConfig":{"xp":{"base":220,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
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
