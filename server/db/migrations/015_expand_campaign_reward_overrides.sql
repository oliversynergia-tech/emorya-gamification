UPDATE economy_settings
SET campaign_overrides = jsonb_build_object(
  'direct',
  jsonb_build_object(
    'signupBonusXp', COALESCE((campaign_overrides -> 'direct' ->> 'signupBonusXp')::numeric, 0),
    'monthlyConversionBonusXp', COALESCE((campaign_overrides -> 'direct' ->> 'monthlyConversionBonusXp')::numeric, 0),
    'annualConversionBonusXp', COALESCE((campaign_overrides -> 'direct' ->> 'annualConversionBonusXp')::numeric, 0),
    'annualDirectTokenBonus', COALESCE((campaign_overrides -> 'direct' ->> 'annualDirectTokenBonus')::numeric, 0),
    'questXpMultiplierBonus', COALESCE((campaign_overrides -> 'direct' ->> 'questXpMultiplierBonus')::numeric, 0),
    'eligibilityPointsMultiplierBonus', COALESCE((campaign_overrides -> 'direct' ->> 'eligibilityPointsMultiplierBonus')::numeric, 0),
    'tokenYieldMultiplierBonus', COALESCE((campaign_overrides -> 'direct' ->> 'tokenYieldMultiplierBonus')::numeric, 0),
    'minimumEligibilityPointsOffset', COALESCE((campaign_overrides -> 'direct' ->> 'minimumEligibilityPointsOffset')::numeric, 0),
    'directTokenRewardBonus', COALESCE((campaign_overrides -> 'direct' ->> 'directTokenRewardBonus')::numeric, 0)
  ),
  'zealy',
  jsonb_build_object(
    'signupBonusXp', COALESCE((campaign_overrides -> 'zealy' ->> 'signupBonusXp')::numeric, 10),
    'monthlyConversionBonusXp', COALESCE((campaign_overrides -> 'zealy' ->> 'monthlyConversionBonusXp')::numeric, 20),
    'annualConversionBonusXp', COALESCE((campaign_overrides -> 'zealy' ->> 'annualConversionBonusXp')::numeric, 40),
    'annualDirectTokenBonus', COALESCE((campaign_overrides -> 'zealy' ->> 'annualDirectTokenBonus')::numeric, 5),
    'questXpMultiplierBonus', COALESCE((campaign_overrides -> 'zealy' ->> 'questXpMultiplierBonus')::numeric, 0.05),
    'eligibilityPointsMultiplierBonus', COALESCE((campaign_overrides -> 'zealy' ->> 'eligibilityPointsMultiplierBonus')::numeric, 0.10),
    'tokenYieldMultiplierBonus', COALESCE((campaign_overrides -> 'zealy' ->> 'tokenYieldMultiplierBonus')::numeric, 0.05),
    'minimumEligibilityPointsOffset', COALESCE((campaign_overrides -> 'zealy' ->> 'minimumEligibilityPointsOffset')::numeric, -10),
    'directTokenRewardBonus', COALESCE((campaign_overrides -> 'zealy' ->> 'directTokenRewardBonus')::numeric, 1)
  ),
  'galxe',
  jsonb_build_object(
    'signupBonusXp', COALESCE((campaign_overrides -> 'galxe' ->> 'signupBonusXp')::numeric, 5),
    'monthlyConversionBonusXp', COALESCE((campaign_overrides -> 'galxe' ->> 'monthlyConversionBonusXp')::numeric, 30),
    'annualConversionBonusXp', COALESCE((campaign_overrides -> 'galxe' ->> 'annualConversionBonusXp')::numeric, 55),
    'annualDirectTokenBonus', COALESCE((campaign_overrides -> 'galxe' ->> 'annualDirectTokenBonus')::numeric, 7),
    'questXpMultiplierBonus', COALESCE((campaign_overrides -> 'galxe' ->> 'questXpMultiplierBonus')::numeric, 0.03),
    'eligibilityPointsMultiplierBonus', COALESCE((campaign_overrides -> 'galxe' ->> 'eligibilityPointsMultiplierBonus')::numeric, 0.12),
    'tokenYieldMultiplierBonus', COALESCE((campaign_overrides -> 'galxe' ->> 'tokenYieldMultiplierBonus')::numeric, 0.08),
    'minimumEligibilityPointsOffset', COALESCE((campaign_overrides -> 'galxe' ->> 'minimumEligibilityPointsOffset')::numeric, -5),
    'directTokenRewardBonus', COALESCE((campaign_overrides -> 'galxe' ->> 'directTokenRewardBonus')::numeric, 2)
  ),
  'layer3',
  jsonb_build_object(
    'signupBonusXp', COALESCE((campaign_overrides -> 'layer3' ->> 'signupBonusXp')::numeric, 15),
    'monthlyConversionBonusXp', COALESCE((campaign_overrides -> 'layer3' ->> 'monthlyConversionBonusXp')::numeric, 25),
    'annualConversionBonusXp', COALESCE((campaign_overrides -> 'layer3' ->> 'annualConversionBonusXp')::numeric, 70),
    'annualDirectTokenBonus', COALESCE((campaign_overrides -> 'layer3' ->> 'annualDirectTokenBonus')::numeric, 10),
    'questXpMultiplierBonus', COALESCE((campaign_overrides -> 'layer3' ->> 'questXpMultiplierBonus')::numeric, 0.08),
    'eligibilityPointsMultiplierBonus', COALESCE((campaign_overrides -> 'layer3' ->> 'eligibilityPointsMultiplierBonus')::numeric, 0.15),
    'tokenYieldMultiplierBonus', COALESCE((campaign_overrides -> 'layer3' ->> 'tokenYieldMultiplierBonus')::numeric, 0.10),
    'minimumEligibilityPointsOffset', COALESCE((campaign_overrides -> 'layer3' ->> 'minimumEligibilityPointsOffset')::numeric, -15),
    'directTokenRewardBonus', COALESCE((campaign_overrides -> 'layer3' ->> 'directTokenRewardBonus')::numeric, 2)
  )
);
