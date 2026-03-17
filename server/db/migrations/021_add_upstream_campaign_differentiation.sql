ALTER TABLE economy_settings
  ADD COLUMN IF NOT EXISTS differentiate_upstream_campaign_sources BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE economy_settings
SET campaign_overrides = jsonb_set(
  campaign_overrides - 'layer3',
  '{taskon}',
  COALESCE(campaign_overrides->'taskon', campaign_overrides->'layer3', '{}'::jsonb),
  true
)
WHERE campaign_overrides ? 'layer3' OR NOT (campaign_overrides ? 'taskon');

UPDATE quest_definitions
SET slug = 'taskon-conversion-lane',
    title = 'TaskOn conversion lane',
    description = 'Complete the TaskOn bridge checkpoint that sends users into the Zealy campaign path.',
    metadata = replace(
      replace(metadata::text, 'layer3', 'taskon'),
      'https://example.com/taskon-bridge',
      'https://example.com/taskon-bridge'
    )::jsonb
WHERE slug = 'layer3-conversion-lane' OR metadata::text LIKE '%layer3%';

UPDATE users
SET attribution_source = 'taskon'
WHERE lower(COALESCE(attribution_source, '')) = 'layer3';
