UPDATE quest_definitions
SET
  xp_reward = 75,
  metadata = '{"track":"starter","targetUrl":"https://website.emorya.com/#/landing","unlockRules":{"all":[]},"submissionGuidance":{"evidence":["app install screenshot"]},"rewardConfig":{"xp":{"base":75,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'download-the-emorya-app';

UPDATE quest_definitions
SET
  xp_reward = 100,
  metadata = '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/app-open","_urlNote":"PENDING: Need Emorya app deep link or universal link to open the app. Ask dev team. Fall back to app store page if no deep link exists.","unlockRules":{"all":[{"type":"quest_completed","value":"download-the-emorya-app"}]},"rewardConfig":{"xp":{"base":100,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'open-the-app-for-the-first-time';

UPDATE quest_definitions
SET
  xp_reward = 200,
  metadata = '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/create-account","_urlNote":"PENDING: Need Emorya app deep link to the account creation screen.","unlockRules":{"all":[{"type":"quest_completed","value":"open-the-app-for-the-first-time"}]},"rewardConfig":{"xp":{"base":200,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'create-emorya-account';

UPDATE quest_definitions
SET
  xp_reward = 35,
  required_level = 2,
  metadata = '{"track":"daily","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/daily-wheel","_urlNote":"PENDING: Need Emorya app deep link to the daily wheel spin feature.","unlockRules":{"all":[{"type":"min_level","value":2},{"type":"quest_completed","value":"confirm-your-starter-setup"}]},"rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'complete-daily-wheel-spin';

UPDATE quest_definitions
SET
  required_level = 2,
  metadata = '{"track":"daily","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/emoryan-adventure","_urlNote":"PENDING: Need Emorya app deep link to the Emoryan Adventure game.","unlockRules":{"all":[{"type":"quest_completed","value":"complete-daily-wheel-spin"}]},"rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'play-emoryan-adventure-game';

UPDATE quest_definitions
SET
  category = 'app',
  xp_reward = 300,
  verification_type = 'wallet-check',
  metadata = '{"track":"wallet","platformLabel":"xPortal","proofInstructions":"Verify your linked xPortal wallet to complete this activation step.","walletCheckMode":"linked-wallet-ownership","requiredWalletPrefix":"erd","unlockRules":{"all":[{"type":"min_level","value":2},{"type":"quest_completed","value":"open-or-create-your-xportal-wallet"}]},"rewardConfig":{"xp":{"base":300,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":35}}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'connect-your-xportal-wallet';

UPDATE quest_definitions
SET
  xp_reward = 125,
  metadata = '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/emrs-reward-path","_urlNote":"PENDING: Need Emorya app deep link to the EMRS reward path screen.","unlockRules":{"all":[{"type":"min_level","value":2},{"type":"quest_completed","value":"connect-your-xportal-wallet"}]},"rewardConfig":{"xp":{"base":125,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":16}}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'view-your-emrs-reward-path';

UPDATE quest_definitions
SET
  xp_reward = 350,
  metadata = '{"track":"starter","unlockRules":{"all":[{"type":"min_level","value":3},{"type":"quest_completed","value":"view-your-emrs-reward-path"}]},"submissionGuidance":{"evidence":["first calorie conversion screenshot"]},"rewardConfig":{"xp":{"base":350,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":30}},"challengeConfig":{"firstConversion":true}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'convert-your-first-calories';

UPDATE quest_definitions
SET
  xp_reward = 450,
  metadata = '{"track":"premium","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/upgrade-monthly","_urlNote":"PENDING: Need Emorya app deep link to the monthly Premium upgrade/purchase screen.","unlockRules":{"all":[{"type":"min_level","value":3},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":450,"premiumMultiplierEligible":false},"tokenEffect":"token_bonus","tokenBonus":{"multiplier":1.3}}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'upgrade-to-premium-monthly';

UPDATE quest_definitions
SET
  xp_reward = 3200,
  metadata = '{"track":"premium","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/upgrade-annual","_urlNote":"PENDING: Need Emorya app deep link to the annual Premium upgrade/purchase screen.","unlockRules":{"all":[{"type":"min_level","value":5},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":3200,"premiumMultiplierEligible":false},"tokenEffect":"direct_token_reward","directTokenReward":{"asset":"EMR","amount":25,"requiresWallet":true}},"annualBonus":{"stakedEmrBase":25,"perConvertedReferral":10}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'upgrade-to-annual';

UPDATE quest_definitions
SET
  title = 'Maintain your qualifying stake for 30 days',
  description = 'Maintain a qualifying EMR stake for 30 days to confirm long-term commitment and preserve your staking status.',
  xp_reward = 1200,
  verification_type = 'manual-review',
  required_tier = 'free',
  required_level = 7,
  is_premium_preview = FALSE,
  is_active = TRUE,
  metadata = '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof that your qualifying EMR stake remained active for 30 days.","stakingVerification":{"mode":"hold-duration","assetSymbol":"EMR","thresholdAmount":1000,"requiredHoldDays":30,"fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":7},{"type":"wallet_linked","value":true},{"type":"quest_completed","value":"unlock-apy-boost-status"}]},"submissionGuidance":{"evidence":["staking dashboard screenshot","30-day staking proof"]},"rewardConfig":{"xp":{"base":1200,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":120}},"challengeConfig":{"durationDays":30},"previewConfig":{"label":"Staking commitment"}}'::jsonb,
  updated_at = NOW()
WHERE slug = 'strengthen-the-core-30-day-hold';

INSERT INTO quest_definitions (
  id, slug, title, description, category, xp_reward, difficulty, verification_type, recurrence,
  required_tier, required_level, is_premium_preview, is_active, metadata
) VALUES
  (
    'e8f9f44f-0707-4e9d-9f31-e2b4c00d7ed7',
    'complete-your-profile',
    'Complete your profile',
    'Complete your Emorya profile so your activation path is fully set up for rewards and progress.',
    'app',
    150,
    'easy',
    'link-visit',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/complete-profile","_urlNote":"PENDING: Need Emorya app deep link to the profile completion screen.","unlockRules":{"all":[{"type":"quest_completed","value":"create-emorya-account"}]},"rewardConfig":{"xp":{"base":150,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '64146c5c-88d1-45a9-90ab-4e15c4824f11',
    'confirm-your-starter-setup',
    'Confirm your starter setup',
    'Review your starter setup so your activation path is ready for the first real in-app loop.',
    'app',
    125,
    'easy',
    'link-visit',
    'one-time',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/starter-setup","_urlNote":"PENDING: Need Emorya app deep link to the starter setup review screen.","unlockRules":{"all":[{"type":"quest_completed","value":"complete-your-profile"}]},"rewardConfig":{"xp":{"base":125,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '502ab487-aa29-4f45-8c09-b3724c1612fc',
    'download-xportal',
    'Download xPortal',
    'Download xPortal to prepare for wallet-linked rewards, staking, and monetisation readiness.',
    'app',
    125,
    'easy',
    'link-visit',
    'one-time',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://xportal.com","unlockRules":{"all":[{"type":"quest_completed","value":"play-emoryan-adventure-game"}]},"rewardConfig":{"xp":{"base":125,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '25bfb6b8-e57f-4eb6-a7c0-3d84733b3c0b',
    'open-or-create-your-xportal-wallet',
    'Open or create your xPortal wallet',
    'Open or create your xPortal wallet so your Emorya activation path becomes reward-ready.',
    'app',
    175,
    'medium',
    'link-visit',
    'one-time',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://xportal.com","unlockRules":{"all":[{"type":"quest_completed","value":"download-xportal"}]},"rewardConfig":{"xp":{"base":175,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'f973f98e-df98-4213-b6f3-0586c7bd093c',
    'complete-the-full-activation-ladder',
    'Complete the full activation ladder',
    'Complete the full onboarding and activation journey to become a fully activated Emorya user.',
    'app',
    750,
    'medium',
    'link-visit',
    'one-time',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://PENDING-DEV-INPUT.emorya.com/activation-complete","_urlNote":"PENDING: Need Emorya app deep link or gamification platform URL for activation completion confirmation.","unlockRules":{"all":[{"type":"min_level","value":3},{"type":"quest_completed","value":"convert-your-first-calories"}]},"rewardConfig":{"xp":{"base":750,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":60}},"previewConfig":{"label":"Activation complete"}}'::jsonb
  ),
  (
    '2f675c6a-8d50-4136-8534-7aec49f5dc94',
    'stake-your-first-emr',
    'Stake your first EMR',
    'Stake your first EMR to begin your monetisation-readiness journey inside Emorya.',
    'staking',
    250,
    'medium',
    'manual-review',
    'one-time',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof of your first EMR staking action.","stakingVerification":{"mode":"first-stake","assetSymbol":"EMR","fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":2},{"type":"wallet_linked","value":true}]},"submissionGuidance":{"evidence":["staking confirmation screenshot"]},"rewardConfig":{"xp":{"base":250,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":40}},"previewConfig":{"label":"First stake"}}'::jsonb
  ),
  (
    'c731cdf5-0a9a-4bd2-a748-304c0db6ca0e',
    'reach-staking-threshold-a',
    'Reach staking threshold A',
    'Reach the first meaningful EMR staking threshold to unlock stronger commitment status.',
    'staking',
    400,
    'medium',
    'manual-review',
    'one-time',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof that you crossed the first qualifying staking threshold.","stakingVerification":{"mode":"threshold","assetSymbol":"EMR","thresholdAmount":500,"thresholdLabel":"Threshold A","fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":3},{"type":"wallet_linked","value":true},{"type":"quest_completed","value":"stake-your-first-emr"}]},"submissionGuidance":{"evidence":["staking threshold screenshot"]},"rewardConfig":{"xp":{"base":400,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":60}},"previewConfig":{"label":"Threshold A"}}'::jsonb
  ),
  (
    '0f714d22-4dfb-4b3c-8317-ed34e4ad6b4f',
    'reach-staking-threshold-b',
    'Reach staking threshold B',
    'Reach the second staking threshold to unlock deeper commitment status and APY boost eligibility.',
    'staking',
    900,
    'hard',
    'manual-review',
    'one-time',
    'free',
    4,
    FALSE,
    TRUE,
    '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof that you crossed the second qualifying staking threshold.","stakingVerification":{"mode":"threshold","assetSymbol":"EMR","thresholdAmount":1000,"thresholdLabel":"Threshold B","fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":4},{"type":"wallet_linked","value":true},{"type":"quest_completed","value":"reach-staking-threshold-a"}]},"submissionGuidance":{"evidence":["staking threshold screenshot"]},"rewardConfig":{"xp":{"base":900,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":90}},"previewConfig":{"label":"Threshold B"}}'::jsonb
  ),
  (
    'e45f2dd0-c1c4-4138-885d-5b7fcfc3da8f',
    'unlock-apy-boost-status',
    'Unlock APY boost status',
    'Qualify for APY boost status by reaching the required staking threshold and confirming your eligibility.',
    'staking',
    600,
    'medium',
    'manual-review',
    'one-time',
    'free',
    4,
    FALSE,
    TRUE,
    '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof that your qualifying stake is ready for APY boost status.","stakingVerification":{"mode":"apy-eligibility","assetSymbol":"EMR","thresholdAmount":1000,"thresholdLabel":"APY threshold","fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":4},{"type":"wallet_linked","value":true},{"type":"quest_completed","value":"reach-staking-threshold-b"}]},"submissionGuidance":{"evidence":["staking eligibility screenshot"]},"rewardConfig":{"xp":{"base":600,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":70}},"previewConfig":{"label":"APY boost status"}}'::jsonb
  ),
  (
    'd893a2fb-6b58-4819-8494-46615d01f62a',
    'referred-staker-bonus',
    'Referred staker bonus',
    'Earn a bonus when one of your referred users reaches a qualifying EMR staking threshold.',
    'staking',
    500,
    'medium',
    'manual-review',
    'monthly',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"wallet","platformLabel":"Staking","proofType":"screenshot","proofInstructions":"Submit proof that a referred user reached the required staking threshold.","stakingVerification":{"mode":"referred-threshold","assetSymbol":"EMR","thresholdAmount":500,"thresholdLabel":"Referral threshold","fallbackMode":"manual-review"},"unlockRules":{"all":[{"type":"min_level","value":3},{"type":"successful_referrals","value":1},{"type":"wallet_linked","value":true}]},"submissionGuidance":{"evidence":["referral staking proof"]},"rewardConfig":{"xp":{"base":500,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":55}},"previewConfig":{"label":"Referral staking bonus"}}'::jsonb
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
WHERE slug IN (
  'join-emorya-telegram',
  'follow-emorya-on-x',
  'download-the-emorya-app',
  'open-the-app-for-the-first-time',
  'create-emorya-account',
  'complete-your-profile',
  'confirm-your-starter-setup',
  'play-emoryan-adventure-game',
  'complete-daily-wheel-spin',
  'download-xportal',
  'open-or-create-your-xportal-wallet',
  'view-your-emrs-reward-path',
  'convert-your-first-calories',
  'complete-the-full-activation-ladder',
  '500-in-24',
  'weekly-warrior',
  '14-day-calorie-streak',
  'convert-2000-calories-to-emrs',
  'emorya-marathon',
  'stake-your-first-emr',
  'reach-staking-threshold-a',
  'reach-staking-threshold-b',
  'unlock-apy-boost-status',
  'referred-staker-bonus',
  'strengthen-the-core-30-day-hold',
  'rate-emorya-on-the-app-store',
  'leave-your-first-emorya-review',
  'share-your-verified-progress-screenshot',
  'share-your-emorya-testimonial',
  'explain-your-calorie-to-emrs-journey'
);

UPDATE quest_definitions
SET metadata = jsonb_set(
      (metadata || '{"questPortability":"portable_adapt"}'::jsonb) - 'brandThemes',
      '{brandThemes}',
      '["emorya","xportal"]'::jsonb,
      true
    ),
    updated_at = NOW()
WHERE slug = 'connect-your-xportal-wallet';
