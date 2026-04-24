UPDATE quest_definitions
SET metadata = '{
  "track":"social",
  "platformLabel":"X",
  "ctaLabel":"Open X task",
      "targetUrl":"https://x.com/EmoryaApp",
  "proofType":"url",
  "proofInstructions":"Open the active Emorya post, share or repost it on X, then submit the public post URL for review.",
  "taskBlocks":[
    {
      "id":"open-x-thread",
      "label":"Open the active Emorya post",
      "platformLabel":"X",
      "ctaLabel":"Open thread",
      "targetUrl":"https://x.com/EmoryaApp",
      "proofType":"link",
      "proofInstructions":"Open the active X thread before completing the proof step.",
      "required":true
    },
    {
      "id":"submit-share-proof",
      "label":"Submit your shared-post proof",
      "description":"Paste the repost, quote post, or reply link.",
      "platformLabel":"X",
      "proofType":"url",
      "proofInstructions":"Paste the public X URL for review.",
      "required":true
    }
  ],
  "unlockRules":{"all":[{"type":"min_level","value":2}]},
  "submissionGuidance":{"evidence":["shared post link"]},
  "rewardConfig":{"xp":{"base":35,"premiumMultiplierEligible":true},"tokenEffect":"none"}
}'::jsonb,
    updated_at = NOW()
WHERE slug = 'share-an-emorya-post';

UPDATE quest_definitions
SET metadata = '{
  "track":"social",
  "platformLabel":"App Store",
  "ctaLabel":"Open store listing",
  "targetUrl":"https://apps.apple.com/us/app/emorya/id6449254736",
  "helpUrl":"https://apps.apple.com/us/app/emorya/id6449254736",
  "proofType":"screenshot",
  "proofInstructions":"Leave a genuine written review, then upload a review screenshot or paste the visible review proof for moderation.",
  "unlockRules":{"all":[{"type":"min_level","value":4}]},
  "submissionGuidance":{"evidence":["review screenshot","review text excerpt"]},
  "rewardConfig":{"xp":{"base":120,"premiumMultiplierEligible":true},"tokenEffect":"none"},
  "previewConfig":{"label":"Review credibility quest"}
}'::jsonb,
    updated_at = NOW()
WHERE slug = 'leave-your-first-emorya-review';

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
    'fe80b525-7453-40db-b224-53d2f39fc7db',
    'verify-zealy-campaign-task',
    'Verify Zealy campaign task',
    'Complete the linked Zealy task and submit the external reference for API verification.',
    'app',
    80,
    'medium',
    'api-check',
    'one-time',
    'free',
    1,
    FALSE,
    FALSE,
    '{
      "track":"campaign",
      "platformLabel":"Zealy",
      "ctaLabel":"Open Zealy task",
      "targetUrl":"https://PENDING-CAMPAIGN.emorya.com/zealy-quest",
      "_urlNote":"PENDING: Both the Zealy task URL and the API verification endpoint need real values.",
      "proofType":"url",
      "proofInstructions":"Complete the Zealy task, then submit the external reference URL or completion id for verification.",
      "apiVerification":{"endpointUrl":"https://PENDING-API.emorya.com/api/verify/zealy","method":"POST","failureMode":"pending-review"},
      "rewardConfig":{"xp":{"base":80,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":15}},
      "previewConfig":{"label":"Zealy API check"}
    }'::jsonb
  ),
  (
    'c7a9917c-02ad-46ef-94fd-6850c2a88647',
    'verify-galxe-campaign-credential',
    'Verify Galxe campaign credential',
    'Complete the linked Galxe credential step and submit the participation reference for verification.',
    'social',
    70,
    'medium',
    'api-check',
    'one-time',
    'free',
    1,
    FALSE,
    FALSE,
    '{
      "track":"campaign",
      "platformLabel":"Galxe",
      "ctaLabel":"Open Galxe campaign",
      "targetUrl":"https://PENDING-CAMPAIGN.emorya.com/galxe-credential",
      "_urlNote":"PENDING: Both the Galxe campaign URL and the API verification endpoint need real values.",
      "proofType":"url",
      "proofInstructions":"Complete the credential step, then submit the Galxe profile or participation reference for verification.",
      "apiVerification":{"endpointUrl":"https://PENDING-API.emorya.com/api/verify/galxe","method":"POST","failureMode":"pending-review"},
      "rewardConfig":{"xp":{"base":70,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}},
      "previewConfig":{"label":"Galxe credential check"}
    }'::jsonb
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
