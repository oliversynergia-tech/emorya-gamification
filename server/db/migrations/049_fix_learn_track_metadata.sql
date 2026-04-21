UPDATE quest_definitions
SET metadata = jsonb_set(metadata, '{track}', '"quiz"'::jsonb, true),
    updated_at = NOW()
WHERE metadata->>'track' = 'learn';
