UPDATE economy_settings
SET campaign_overrides = jsonb_build_object(
  'direct',
  COALESCE(campaign_overrides->'direct', '{}'::jsonb) || '{"weeklyTargetXpOffset":0,"premiumUpsellBonusMultiplier":0,"leaderboardMomentumBonus":0}'::jsonb,
  'zealy',
  COALESCE(campaign_overrides->'zealy', '{}'::jsonb) || '{"weeklyTargetXpOffset":-15,"premiumUpsellBonusMultiplier":0.08,"leaderboardMomentumBonus":0.05}'::jsonb,
  'galxe',
  COALESCE(campaign_overrides->'galxe', '{}'::jsonb) || '{"weeklyTargetXpOffset":-10,"premiumUpsellBonusMultiplier":0.10,"leaderboardMomentumBonus":0.08}'::jsonb,
  'layer3',
  COALESCE(campaign_overrides->'layer3', '{}'::jsonb) || '{"weeklyTargetXpOffset":-20,"premiumUpsellBonusMultiplier":0.12,"leaderboardMomentumBonus":0.12}'::jsonb
)
WHERE is_active = TRUE;
