UPDATE quest_definitions
SET metadata = metadata || '{"questPortability":"emorya_only"}'::jsonb,
    updated_at = NOW()
WHERE slug IN (
  'create-emorya-account',
  'play-emoryan-adventure-game',
  'complete-daily-wheel-spin',
  'convert-your-first-calories',
  '500-in-24',
  'weekly-warrior',
  '14-day-calorie-streak',
  'convert-2000-calories-to-emrs',
  'emorya-marathon',
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

UPDATE quest_definitions
SET metadata = metadata || '{"questPortability":"campaign_conditional"}'::jsonb,
    updated_at = NOW()
WHERE slug IN (
  'zealy-bridge-sprint',
  'galxe-migration-loop',
  'taskon-conversion-lane',
  'verify-zealy-campaign-task',
  'verify-galxe-campaign-credential'
);
