-- Point referral quests to the platform profile page
UPDATE quest_definitions
SET metadata = (metadata - '_urlNote') || jsonb_build_object('targetUrl', '/profile'),
    updated_at = NOW()
WHERE slug IN (
  'invite-your-first-accountability-partner',
  'refer-one-user-who-converts-calories'
);
