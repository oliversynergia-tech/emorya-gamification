UPDATE quest_definitions
SET is_active = TRUE, updated_at = NOW()
WHERE slug IN (
  'zealy-bridge-sprint',
  'galxe-migration-loop',
  'taskon-conversion-lane',
  'fourteen-day-calorie-streak'
)
AND is_active = FALSE;
