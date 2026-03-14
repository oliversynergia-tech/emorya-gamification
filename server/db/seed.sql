INSERT INTO users (
  id,
  email,
  password_hash,
  display_name,
  avatar_url,
  attribution_source,
  level,
  total_xp,
  current_streak,
  longest_streak,
  subscription_tier,
  referral_code,
  referred_by,
  created_at
) VALUES
  (
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    'oliver@emorya.com',
    '$2b$12$replace.with.real.hash.before.prod',
    'Oliver',
    NULL,
    'zealy',
    8,
    4520,
    14,
    14,
    'free',
    'EMORYA-8W3K9R',
    NULL,
    NOW() - INTERVAL '14 days'
  ),
  (
    '2196480b-b0fc-4e15-8837-e1d02177c7ed',
    'lina@emorya.com',
    NULL,
    'Lina',
    NULL,
    'social',
    18,
    37140,
    31,
    31,
    'annual',
    'EMORYA-LINA18',
    NULL,
    NOW() - INTERVAL '60 days'
  ),
  (
    '9010db77-a008-4f24-ac2c-af801dca9a6b',
    'kairo@emorya.com',
    NULL,
    'Kairo',
    NULL,
    'referral',
    17,
    35520,
    21,
    24,
    'annual',
    'EMORYA-KAI17',
    NULL,
    NOW() - INTERVAL '52 days'
  ),
  (
    'c657ad58-bf65-4def-8cab-5f2bd4a85dbf',
    'mia@emorya.com',
    NULL,
    'Mia',
    NULL,
    'organic',
    16,
    34100,
    18,
    20,
    'monthly',
    'EMORYA-MIA16',
    NULL,
    NOW() - INTERVAL '46 days'
  ),
  (
    '8cc801df-004b-4e20-a5c1-cf5f0f1f642d',
    'nico@emorya.com',
    NULL,
    'Nico',
    NULL,
    'ads',
    8,
    4485,
    9,
    13,
    'free',
    'EMORYA-NICO08',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    NOW() - INTERVAL '16 days'
  ),
  (
    '2b74bcd9-98e8-455a-bede-d1a5876775fd',
    'aya@emorya.com',
    NULL,
    'Aya',
    NULL,
    'social',
    8,
    4440,
    10,
    12,
    'monthly',
    'EMORYA-AYA08',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    NOW() - INTERVAL '18 days'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_roles (user_id, role, granted_by) VALUES
  ('6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'super_admin'::app_role, NULL),
  ('6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'admin'::app_role, NULL)
ON CONFLICT (user_id, role) DO NOTHING;

INSERT INTO user_identities (id, user_id, provider, provider_subject, status, created_at) VALUES
  (
    'f62d4e31-b801-4669-bc44-b447acfbf4ce',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    'multiversx',
    'erd1emoryaoliverwallet0000000000000000000000000000000000000',
    'active',
    NOW() - INTERVAL '13 days'
  ),
  (
    '8b0d2cc8-08ab-4465-9aa8-e8f2296c1108',
    '2196480b-b0fc-4e15-8837-e1d02177c7ed',
    'multiversx',
    'erd1emoryalinaannual000000000000000000000000000000000000000',
    'active',
    NOW() - INTERVAL '44 days'
  )
ON CONFLICT (provider, provider_subject) DO NOTHING;

INSERT INTO social_connections (id, user_id, platform, handle, verified, connected_at) VALUES
  ('7bb59c4d-42f4-471d-82f3-8a96a55bcb0f', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'X', '@oliver_moves', TRUE, NOW() - INTERVAL '13 days'),
  ('118e1e4c-dcbc-428f-bf72-c833f7f28d56', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'Telegram', 'olivermoves', TRUE, NOW() - INTERVAL '13 days'),
  ('532f5286-1a9b-4102-b8fd-41be8b1140f0', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'Discord', 'oliver#8402', TRUE, NOW() - INTERVAL '12 days'),
  ('d1d5f3aa-7c67-4b22-ae84-503979c53e5d', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'TikTok', NULL, FALSE, NULL),
  ('87b9af1d-6efe-4d6d-b05b-37df0911a0d9', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'Instagram', NULL, FALSE, NULL),
  ('dd617222-d1d8-4c27-a41c-18411d04191f', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'CoinMarketCap', NULL, FALSE, NULL)
ON CONFLICT (user_id, platform) DO NOTHING;

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
    '4b93f90c-cd8b-4297-bc7d-6f1ebf5293fa',
    'share-the-movement-reset',
    'Share the movement reset',
    'Post Emorya''s latest recovery story on X with the campaign hashtag.',
    'social',
    30,
    'easy',
    'social-oauth',
    'daily',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '4cbda570-89a7-4c9d-bcdc-3e482ed02ae3',
    'premium-economics-quiz',
    'Premium economics quiz',
    'Finish a 5-question lesson on Premium benefits and annual savings.',
    'learn',
    45,
    'medium',
    'quiz',
    'one-time',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"quiz","passScore":4,"totalQuestions":5,"rewardConfig":{"xp":{"base":45,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":16}}}'::jsonb
  ),
  (
    'd19f442f-3b81-454c-aa94-6f33b7524d59',
    'visit-premium-explainer',
    'Visit the premium explainer',
    'Open the premium benefits explainer and confirm the visit.',
    'learn',
    20,
    'easy',
    'link-visit',
    'daily',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/premium-explainer","rewardConfig":{"xp":{"base":20,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'ca8d9fdd-aa13-4e69-8ae7-615f7a2a0f83',
    'complete-welcome-setup',
    'Complete your welcome setup',
    'Open your profile hub, review your starter path, and confirm your first unlocks.',
    'app',
    30,
    'easy',
    'link-visit',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/welcome-setup","rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '5a425a67-b7ab-4bca-9629-a90a507663e5',
    'open-the-xportal-setup-guide',
    'Open the xPortal setup guide',
    'Walk through the xPortal connection flow so your reward rail is ready.',
    'learn',
    35,
    'easy',
    'link-visit',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"wallet","targetUrl":"https://example.com/xportal-setup","rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}}}'::jsonb
  ),
  (
    'c90f8fab-a89d-41cc-ad69-73527891e7e2',
    'connect-your-first-community-channel',
    'Connect your first community channel',
    'Link one Emorya social surface so higher-yield growth quests can unlock.',
    'social',
    40,
    'easy',
    'link-visit',
    'one-time',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"starter","targetUrl":"https://example.com/community-connect","rewardConfig":{"xp":{"base":40,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '7cc727ca-e6eb-4bb1-917d-ef9b6d9bf9bd',
    'daily-recovery-check-in',
    'Daily recovery check-in',
    'Open today''s recovery prompt and log one intentional action for your body.',
    'app',
    28,
    'easy',
    'link-visit',
    'daily',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"daily","targetUrl":"https://example.com/daily-recovery","rewardConfig":{"xp":{"base":28,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    'ef257868-6d9d-4fcf-9ce9-3ee1920548e4',
    'hydration-reset-week',
    'Hydration reset week',
    'Submit one hydration check snapshot to keep your weekly wellness bar moving.',
    'app',
    55,
    'easy',
    'manual-review',
    'weekly',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"daily","rewardConfig":{"xp":{"base":55,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":15}},"cooldownHours":24}'::jsonb
  ),
  (
    'e62bc5b8-3280-4d18-b2fd-a1524c21b453',
    'log-8000-steps',
    'Log 8,000 steps in the app',
    'Upload your day summary or connect the Emorya API when available.',
    'app',
    60,
    'medium',
    'manual-review',
    'daily',
    'free',
    6,
    FALSE,
    TRUE,
    '{"track":"daily","rewardConfig":{"xp":{"base":60,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":20}},"cooldownHours":20}'::jsonb
  ),
  (
    'df10d884-7c1a-403d-9bd5-aeb4ee7f95a4',
    'complete-the-community-triangle',
    'Complete the community triangle',
    'Visit the X, Telegram, and Discord hubs and clear the social growth trio.',
    'social',
    75,
    'medium',
    'link-visit',
    'weekly',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"social","targetUrl":"https://example.com/community-triangle","unlockRules":{"all":[{"type":"connected_social_count","value":1}]},"rewardConfig":{"xp":{"base":75,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":22}}}'::jsonb
  ),
  (
    '3275f8ca-13cd-4297-94fc-f0f45458d225',
    'send-your-first-referral-wave',
    'Send your first referral wave',
    'Share your referral code with a friend and confirm your invite push.',
    'referral',
    35,
    'easy',
    'link-visit',
    'daily',
    'free',
    2,
    FALSE,
    TRUE,
    '{"track":"referral","targetUrl":"https://example.com/referral-wave","rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"none"}}'::jsonb
  ),
  (
    '0baa67a0-0d57-42fd-87e5-d77052986842',
    'three-friend-momentum-push',
    'Three-friend momentum push',
    'Stack three successful signups to unlock the next referral lane.',
    'referral',
    95,
    'medium',
    'link-visit',
    'weekly',
    'free',
    4,
    FALSE,
    TRUE,
    '{"track":"referral","targetUrl":"https://example.com/referral-push","unlockRules":{"all":[{"type":"successful_referrals","value":1}]},"rewardConfig":{"xp":{"base":95,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":25}}}'::jsonb
  ),
  (
    '379b37d0-8cdd-4e93-95bc-f8b1b5a6afe0',
    'monthly-momentum-sprint',
    'Monthly momentum sprint',
    'Clear a premium-only momentum sprint that boosts your weekly reward ceiling.',
    'limited',
    110,
    'medium',
    'link-visit',
    'weekly',
    'monthly',
    5,
    TRUE,
    TRUE,
    '{"track":"premium","targetUrl":"https://example.com/monthly-sprint","unlockRules":{"all":[{"type":"subscription_tier","value":"monthly"},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":110,"premiumMultiplierEligible":true},"tokenEffect":"token_bonus","tokenBonus":{"multiplier":1.2}}}'::jsonb
  ),
  (
    'b2e73062-4fa1-4ed7-af5c-f5d75c9f1103',
    'zealy-bridge-sprint',
    'Zealy bridge sprint',
    'Convert your Zealy momentum into native Emorya activity by clearing the bridge sprint.',
    'limited',
    85,
    'easy',
    'link-visit',
    'weekly',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"campaign","targetUrl":"https://example.com/zealy-bridge","unlockRules":{"all":[{"type":"campaign_source","value":"zealy"}]},"rewardConfig":{"xp":{"base":85,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}}}'::jsonb
  ),
  (
    '75d12a7a-c326-4fb5-9af4-fec69f04ccab',
    'galxe-migration-loop',
    'Galxe migration loop',
    'Move a Galxe audience member into the native Emorya habit and wallet loop.',
    'limited',
    90,
    'medium',
    'link-visit',
    'weekly',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"campaign","targetUrl":"https://example.com/galxe-bridge","unlockRules":{"all":[{"type":"campaign_source","value":"galxe"}]},"rewardConfig":{"xp":{"base":90,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}}}'::jsonb
  ),
  (
    '59a8048b-8c8a-4f7a-b383-a08cf69ee6d4',
    'layer3-conversion-lane',
    'Layer3 conversion lane',
    'Guide a Layer3 entrant from campaign claim behavior into recurring Emorya progress.',
    'limited',
    90,
    'medium',
    'link-visit',
    'weekly',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"campaign","targetUrl":"https://example.com/layer3-bridge","unlockRules":{"all":[{"type":"campaign_source","value":"layer3"}]},"rewardConfig":{"xp":{"base":90,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}}}'::jsonb
  ),
  (
    '8ec2112e-eebc-48dd-a32c-a2ca6c705c5a',
    'create-a-launch-meme',
    'Create a launch meme',
    'Submit a polished meme about momentum, movement, or recovery.',
    'creative',
    80,
    'medium',
    'manual-review',
    'weekly',
    'free',
    7,
    FALSE,
    TRUE,
    '{"track":"creative","rewardConfig":{"xp":{"base":80,"premiumMultiplierEligible":true},"tokenEffect":"none"},"cooldownHours":48}'::jsonb
  ),
  (
    '76d48c0e-38b3-4087-8863-68d308ee60b8',
    'strengthen-the-core-7-day-hold',
    'Strengthen the Core: 7-day stake hold',
    'Maintain an EMR staking position for seven days to unlock a large XP drop.',
    'staking',
    180,
    'hard',
    'wallet-check',
    'weekly',
    'monthly',
    9,
    TRUE,
    TRUE,
    '{"track":"wallet","walletCheckMode":"linked-wallet-ownership","requiredWalletPrefix":"erd","unlockRules":{"all":[{"type":"min_level","value":9},{"type":"wallet_linked","value":true},{"type":"subscription_tier","value":"monthly"},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":180,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":35}},"previewConfig":{"label":"Wallet Rewards"}}'::jsonb
  ),
  (
    '9e8dc739-f0d7-4ed5-b3a4-eb3ff7c8b6ed',
    'annual-team-reward-surge',
    'Annual team reward surge',
    'Run an annual-member referral surge and unlock an instant token spike for your team.',
    'limited',
    210,
    'hard',
    'link-visit',
    'weekly',
    'annual',
    10,
    TRUE,
    TRUE,
    '{"track":"premium","targetUrl":"https://example.com/annual-surge","timebox":"Flash reward day window","unlockRules":{"all":[{"type":"subscription_tier","value":"annual"},{"type":"successful_referrals","value":3},{"type":"starter_path_complete","value":true}]},"rewardConfig":{"xp":{"base":210,"premiumMultiplierEligible":true},"tokenEffect":"direct_token_reward","directTokenReward":{"asset":"EMR","amount":18,"requiresWallet":true}}}'::jsonb
  ),
  (
    '2833c51d-e8f6-49d2-8c38-f4fd032f6af7',
    'signature-creator-brief',
    'Signature creator brief',
    'Publish a multi-post thread or short-form video tagged for the race campaign.',
    'creative',
    240,
    'hard',
    'manual-review',
    'weekly',
    'annual',
    10,
    TRUE,
    TRUE,
    '{"track":"ambassador","timebox":"Ends in 2d 11h","unlockRules":{"all":[{"type":"ambassador_candidate","value":true},{"type":"subscription_tier","value":"annual"}]},"rewardConfig":{"xp":{"base":240,"premiumMultiplierEligible":true},"tokenEffect":"direct_token_reward","directTokenReward":{"asset":"EMR","amount":25,"requiresWallet":true}}}'::jsonb
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

INSERT INTO quest_completions (id, user_id, quest_id, status, submission_data, completed_at) VALUES
  (
    '2d5317b5-354c-4764-9007-ad26dc6bef26',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    '4cbda570-89a7-4c9d-bcdc-3e482ed02ae3',
    'approved',
    '{"score":5,"answersCorrect":5}'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    '7745fe88-37c0-4114-9f79-b61c111f3771',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    'e62bc5b8-3280-4d18-b2fd-a1524c21b453',
    'pending',
    '{"platform":"Emorya App","contentUrl":"https://example.com/day-summary","screenshotUrl":"https://example.com/proof.png","note":"Daily steps synced from wearable","submittedAt":"2026-03-12T09:00:00.000Z"}'::jsonb,
    NULL
  ),
  (
    '274d1bc4-abf1-4d59-bb23-432cbfcb9108',
    '2196480b-b0fc-4e15-8837-e1d02177c7ed',
    '76d48c0e-38b3-4087-8863-68d308ee60b8',
    'approved',
    '{"walletCheck":"stake-held-7-days"}'::jsonb,
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (user_id, quest_id) DO NOTHING;

INSERT INTO achievements (id, slug, name, description, category, condition) VALUES
  (
    '3105690b-c12b-4955-8f24-369953f3362c',
    'zealy-veteran',
    'Zealy Veteran',
    'Recognised warm traffic from a prior campaign journey.',
    'recognition',
    '{"source":"zealy"}'::jsonb
  ),
  (
    'd8d2c5c2-f553-4a78-aa29-e1c8162c66a6',
    'streak-machine',
    'Streak Machine',
    'Maintain a daily quest streak for 30 days.',
    'streak',
    '{"days":30}'::jsonb
  ),
  (
    'd66dfc8f-00b0-45d6-80f8-cfe481f672dc',
    'premium-champion',
    'Premium Champion',
    'Annual Premium badge with top-tier leaderboard prestige.',
    'subscription',
    '{"tier":"annual"}'::jsonb
  ),
  (
    '18e97076-e0c1-4446-a723-64f500cb4555',
    'quest-climber',
    'Quest Climber',
    'Finish five approved quests and prove the loop is sticking.',
    'quests',
    '{"approvedQuests":5}'::jsonb
  ),
  (
    'f8a5272b-d010-44a1-9635-1524f4b7e1d2',
    'referral-catalyst',
    'Referral Catalyst',
    'Bring in three new people with your code.',
    'referral',
    '{"invitedCount":3}'::jsonb
  ),
  (
    '1541ef42-e14d-4817-afb0-d0cf9174e421',
    'conversion-closer',
    'Conversion Closer',
    'Drive two invited users into a paid tier.',
    'referral',
    '{"convertedCount":2}'::jsonb
  ),
  (
    '7c1d67b8-c20e-42fc-9b7e-d0d987eb5f24',
    'level-ascendant',
    'Level Ascendant',
    'Reach level 10 and hold a meaningful presence on the board.',
    'progression',
    '{"level":10}'::jsonb
  ),
  (
    'c92b84d2-e9a9-4cb7-a22f-f3b02be029b3',
    'xp-collector',
    'XP Collector',
    'Accumulate 5,000 total XP across quests, referrals, and streak play.',
    'progression',
    '{"totalXp":5000}'::jsonb
  ),
  (
    'b944662a-f5d7-4d55-a942-1d03fe6bd6d0',
    'wallet-synced',
    'Wallet Synced',
    'Link a MultiversX wallet and bring on-chain identity into the account.',
    'wallet',
    '{"linkedWallets":1}'::jsonb
  ),
  (
    'db806fd0-f7dc-42ff-8f5a-0f13869e4b2e',
    'creator-signal',
    'Creator Signal',
    'Get two manual-review creator quests approved.',
    'creative',
    '{"manualReviewApprovals":2}'::jsonb
  ),
  (
    '1dc2f179-c55e-445d-b33d-389fca6a1593',
    'daily-ritual',
    'Daily Ritual',
    'Complete five approved daily quests.',
    'consistency',
    '{"dailyApprovals":5}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO user_achievements (user_id, achievement_id, progress, earned_at) VALUES
  ('6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', '3105690b-c12b-4955-8f24-369953f3362c', 1, NOW() - INTERVAL '12 days'),
  ('6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'd8d2c5c2-f553-4a78-aa29-e1c8162c66a6', 0.47, NULL),
  ('6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'd66dfc8f-00b0-45d6-80f8-cfe481f672dc', 0, NULL)
ON CONFLICT (user_id, achievement_id) DO NOTHING;

INSERT INTO referrals (
  id,
  referrer_user_id,
  referee_user_id,
  referee_subscribed,
  signup_reward_xp,
  conversion_reward_xp,
  signup_rewarded_at,
  conversion_rewarded_at,
  created_at
) VALUES
  (
    '63b9d1aa-1303-4c3a-9f7d-0c79dc8f42a2',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    '8cc801df-004b-4e20-a5c1-cf5f0f1f642d',
    FALSE,
    40,
    0,
    NOW() - INTERVAL '16 days',
    NULL,
    NOW() - INTERVAL '16 days'
  ),
  (
    '64e0700d-5f73-4286-8f85-ef4c16c0cf62',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    '2b74bcd9-98e8-455a-bede-d1a5876775fd',
    TRUE,
    40,
    120,
    NOW() - INTERVAL '18 days',
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '18 days'
  )
ON CONFLICT (referrer_user_id, referee_user_id) DO NOTHING;

INSERT INTO leaderboard_snapshots (id, user_id, period, xp, rank, snapshot_date) VALUES
  ('55730039-a930-421a-bea5-f02e7a0685f7', '2196480b-b0fc-4e15-8837-e1d02177c7ed', 'all-time', 37140, 1, CURRENT_DATE),
  ('14d3fb4c-1e8f-407f-b8e1-c4f0b96c4bb6', '9010db77-a008-4f24-ac2c-af801dca9a6b', 'all-time', 35520, 2, CURRENT_DATE),
  ('18ced7b2-9908-4fb2-aa02-0a04549d8c99', 'c657ad58-bf65-4def-8cab-5f2bd4a85dbf', 'all-time', 34100, 3, CURRENT_DATE),
  ('07c15333-4cda-47c1-bf4f-909bc95282f4', '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c', 'all-time', 4520, 34, CURRENT_DATE),
  ('d21b6ed0-765d-4a4f-997d-0550c3bef91f', '8cc801df-004b-4e20-a5c1-cf5f0f1f642d', 'all-time', 4485, 35, CURRENT_DATE),
  ('1ba52233-efec-4631-998e-b9f00b1f1176', '2b74bcd9-98e8-455a-bede-d1a5876775fd', 'all-time', 4440, 36, CURRENT_DATE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO activity_log (id, user_id, action_type, xp_earned, metadata, created_at) VALUES
  (
    'e2479df3-bc60-42c3-a53d-d2960d13efe6',
    '2196480b-b0fc-4e15-8837-e1d02177c7ed',
    'subscription_upgrade',
    0,
    '{"actor":"Lina","action":"earned Premium Champion","detail":"upgraded to Annual and unlocked 3 streak freezes","timeAgo":"2m ago"}'::jsonb,
    NOW() - INTERVAL '2 minutes'
  ),
  (
    'ba0fdc1a-4b14-4f7f-8147-384ddfef66d9',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    'daily_complete',
    25,
    '{"actor":"Oliver","action":"completed Daily Complete","detail":"finished 3 featured quests for 25 bonus XP","timeAgo":"11m ago"}'::jsonb,
    NOW() - INTERVAL '11 minutes'
  ),
  (
    '19335cc2-8d39-4954-a5f6-54bb8bcf7854',
    'c657ad58-bf65-4def-8cab-5f2bd4a85dbf',
    'ugc_submission',
    0,
    '{"actor":"Mia","action":"submitted a creator brief","detail":"waiting for review in Be Creative","timeAgo":"17m ago"}'::jsonb,
    NOW() - INTERVAL '17 minutes'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO token_redemptions (
  id,
  user_id,
  asset,
  eligibility_points_spent,
  token_amount,
  status,
  source,
  metadata,
  created_at,
  settled_at
) VALUES
  (
    '62f3ce2a-5d0d-4c32-b1a0-1bdf40ba22b2',
    '6f56c71e-6d79-4b18-bf43-d42d15eb0b8c',
    'EMR',
    120,
    6.0000,
    'settled',
    'xp-conversion',
    '{"note":"Weekly reward conversion","campaign":"direct"}'::jsonb,
    NOW() - INTERVAL '10 days',
    NOW() - INTERVAL '9 days'
  ),
  (
    '54f9ae95-60c6-44b8-81b2-a3917a65e145',
    '2196480b-b0fc-4e15-8837-e1d02177c7ed',
    'EMR',
    100,
    5.0000,
    'claimed',
    'xp-conversion',
    '{"note":"Awaiting payout","campaign":"galxe"}'::jsonb,
    NOW() - INTERVAL '2 days',
    NULL
  )
ON CONFLICT (id) DO NOTHING;
