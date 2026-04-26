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
    'b4b72ae9-9f73-4a15-8cb5-25bd096cd65d',
    'accountability-duo',
    'Accountability Duo',
    'You and a referred friend both burn 500 calories in the same week. Both of you earn 200 bonus XP when you both hit the target.',
    'referral',
    200,
    'medium',
    'manual-review',
    'weekly',
    'free',
    4,
    FALSE,
    TRUE,
    '{"track":"referral","platformLabel":"Emorya App","proofType":"screenshot","proofInstructions":"Submit two screenshots as evidence: (1) your own 500+ calorie burn for this week in the Emorya app, and (2) your referred friend''s 500+ calorie burn for this week (ask them to screenshot and send it to you, or submit their display name so we can verify).","adminReviewNote":"Duo quest: if approved, also award 200 XP to the referred friend identified in the submission. Verify both calorie burns before approving.","unlockRules":{"all":[{"type":"min_level","value":4},{"type":"successful_referrals","value":1}]},"submissionGuidance":{"evidence":["your 500+ calorie burn screenshot this week","referred friend''s 500+ calorie burn screenshot this week OR their display name for verification"]},"rewardConfig":{"xp":{"base":200,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":35}},"challengeConfig":{"type":"duo","calorieTarget":500,"window":"weekly","requiresReferral":true,"bothMustComplete":true},"questPortability":"emorya_only","previewConfig":{"label":"Collaborative challenge"}}'::jsonb
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
WHERE slug = 'accountability-duo';

INSERT INTO achievements (
  id,
  slug,
  name,
  description,
  category,
  condition
) VALUES (
  '6d2a0153-1bdd-4a82-9bde-724a92239ed7',
  'accountability-partner',
  'Accountability Partner',
  'Complete the Accountability Duo challenge three times.',
  'referral',
  '{"duoCompletions":3}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  condition = EXCLUDED.condition;
