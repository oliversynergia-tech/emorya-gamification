UPDATE quest_definitions
SET is_active = FALSE, updated_at = NOW()
WHERE slug = 'visit-premium-explainer'
  AND is_active = TRUE;

UPDATE quest_definitions
SET metadata = jsonb_set(
      metadata,
      '{unlockRules}',
      '{"all":[{"type":"quest_completed_today","value":"log-todays-calorie-burn"}]}'::jsonb
    ),
    updated_at = NOW()
WHERE slug = 'play-emoryan-adventure-game';
