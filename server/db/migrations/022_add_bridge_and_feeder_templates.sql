INSERT INTO quest_definition_templates (
  id,
  label,
  description,
  form_config,
  metadata,
  is_active
) VALUES
  (
    'db2c4bdb-ae54-4ab0-98f8-0d93b7f899f1',
    'Zealy bridge quest',
    'Live Zealy bridge step that turns campaign momentum into wallet-linked Emorya progress.',
    '{"category":"app","difficulty":"medium","verificationType":"link-visit","recurrence":"one-time","requiredTier":"free","requiredLevel":1,"xpReward":85,"isPremiumPreview":false,"isActive":true}'::jsonb,
    '{"track":"campaign","rewardProgramId":"fcae87e5-6f1b-4157-aa26-4c96cdfdd8d6","targetUrl":"https://example.com/zealy-bridge","campaignTemplateKind":"bridge","campaignAttributionSource":"zealy","campaignExperienceLane":"zealy","rewardConfig":{"xp":{"base":85,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":18}},"unlockRules":{"all":[{"type":"campaign_source","value":"zealy"}]},"previewConfig":{"label":"Zealy bridge"}}'::jsonb,
    TRUE
  ),
  (
    'dbf543ea-4e51-4868-a552-0e8bc44dbd5a',
    'Galxe feeder quest',
    'External discovery quest that captures Galxe users and hands them into the Zealy bridge.',
    '{"category":"social","difficulty":"easy","verificationType":"link-visit","recurrence":"one-time","requiredTier":"free","requiredLevel":1,"xpReward":55,"isPremiumPreview":false,"isActive":true}'::jsonb,
    '{"track":"campaign","rewardProgramId":"fcae87e5-6f1b-4157-aa26-4c96cdfdd8d6","targetUrl":"https://example.com/galxe-bridge","campaignTemplateKind":"feeder","campaignAttributionSource":"galxe","campaignExperienceLane":"zealy","requiresUpstreamDifferentiation":false,"rewardConfig":{"xp":{"base":55,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":10}},"unlockRules":{"all":[{"type":"campaign_source","value":"galxe"}]},"previewConfig":{"label":"Galxe to Zealy feeder"}}'::jsonb,
    TRUE
  ),
  (
    '0de0c54c-18be-44b2-a019-f83c2281450f',
    'TaskOn feeder quest',
    'Task-completion handoff quest that moves TaskOn users into the Zealy bridge path.',
    '{"category":"app","difficulty":"medium","verificationType":"link-visit","recurrence":"one-time","requiredTier":"free","requiredLevel":1,"xpReward":60,"isPremiumPreview":false,"isActive":true}'::jsonb,
    '{"track":"campaign","rewardProgramId":"fcae87e5-6f1b-4157-aa26-4c96cdfdd8d6","targetUrl":"https://example.com/taskon-bridge","campaignTemplateKind":"feeder","campaignAttributionSource":"taskon","campaignExperienceLane":"zealy","requiresUpstreamDifferentiation":false,"rewardConfig":{"xp":{"base":60,"premiumMultiplierEligible":true},"tokenEffect":"eligibility_progress","tokenEligibility":{"progressPoints":12}},"unlockRules":{"all":[{"type":"campaign_source","value":"taskon"}]},"previewConfig":{"label":"TaskOn to Zealy feeder"}}'::jsonb,
    TRUE
  )
ON CONFLICT (label) DO UPDATE SET
  description = EXCLUDED.description,
  form_config = EXCLUDED.form_config,
  metadata = EXCLUDED.metadata,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
