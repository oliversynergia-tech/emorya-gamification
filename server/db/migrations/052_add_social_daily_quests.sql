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
    '9a4ebb52-daf4-4232-9158-3cbce5b1de10',
    'engage-with-todays-emorya-post',
    'Engage with today''s Emorya post',
    'Like, reply, or retweet the latest Emorya post on X and submit the post link as proof.',
    'social',
    20,
    'easy',
    'manual-review',
    'daily',
    'free',
    1,
    FALSE,
    TRUE,
    '{"track":"social","platformLabel":"X","ctaLabel":"Open Emorya on X","targetUrl":"https://x.com/EmoryaFinance","proofType":"url","proofInstructions":"Like, reply, or retweet the most recent Emorya post on X, then paste the post URL as proof.","unlockRules":{"all":[]},"submissionGuidance":{"evidence":["post URL showing your like, reply, or retweet"]},"rewardConfig":{"xp":{"base":20,"premiumMultiplierEligible":true},"tokenEffect":"none"},"questPortability":"emorya_only"}'::jsonb
  ),
  (
    '64cc809e-342b-441a-8f4f-bde9b8194904',
    'share-your-daily-streak',
    'Share your daily streak',
    'Post your current Emorya streak on any social platform with #Emorya and submit the public link as proof.',
    'social',
    30,
    'easy',
    'manual-review',
    'daily',
    'free',
    3,
    FALSE,
    TRUE,
    '{"track":"social","platformLabel":"Social","proofType":"url","proofInstructions":"Post your current Emorya streak count on X, Telegram, Instagram, or TikTok. Include #Emorya in the post. Paste the public post URL as proof.","unlockRules":{"all":[{"type":"min_level","value":3},{"type":"min_streak","value":3}]},"submissionGuidance":{"evidence":["public post URL showing your streak count and #Emorya hashtag"]},"rewardConfig":{"xp":{"base":30,"premiumMultiplierEligible":true},"tokenEffect":"none"},"questPortability":"emorya_only"}'::jsonb
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
  'engage-with-todays-emorya-post',
  'share-your-daily-streak'
);
