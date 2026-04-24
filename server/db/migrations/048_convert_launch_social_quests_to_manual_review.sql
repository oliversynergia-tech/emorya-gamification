UPDATE quest_definitions
SET verification_type = 'manual-review',
    description = 'Join the Emorya Telegram community and submit proof that you''re in.',
    metadata = jsonb_build_object(
      'track', 'social',
      'platformLabel', 'Telegram',
      'targetUrl', 'https://t.me/EmoryaFinanceInternational',
      'proofType', 'screenshot',
      'proofInstructions', 'Submit a screenshot showing that you joined the official Emorya Telegram community.',
      'submissionGuidance', jsonb_build_object(
        'evidence', jsonb_build_array('Telegram join screenshot')
      ),
      'unlockRules', jsonb_build_object('all', jsonb_build_array()),
      'rewardConfig', jsonb_build_object(
        'xp', jsonb_build_object('base', 20, 'premiumMultiplierEligible', true),
        'tokenEffect', 'none'
      )
    ),
    updated_at = NOW()
WHERE slug = 'join-emorya-telegram';

UPDATE quest_definitions
SET verification_type = 'manual-review',
    description = 'Join the Emorya Discord server and confirm your entry.',
    metadata = jsonb_build_object(
      'track', 'social',
      'platformLabel', 'Discord',
      'targetUrl', 'https://discord.com/invite/9Jrj7U9Y9R',
      'proofType', 'screenshot',
      'proofInstructions', 'Submit a screenshot showing that you joined the official Emorya Discord server.',
      'submissionGuidance', jsonb_build_object(
        'evidence', jsonb_build_array('Discord join screenshot')
      ),
      'unlockRules', jsonb_build_object('all', jsonb_build_array()),
      'rewardConfig', jsonb_build_object(
        'xp', jsonb_build_object('base', 20, 'premiumMultiplierEligible', true),
        'tokenEffect', 'none'
      )
    ),
    updated_at = NOW()
WHERE slug = 'join-emorya-discord';

UPDATE quest_definitions
SET verification_type = 'manual-review',
    description = 'Follow Emorya on X and submit proof of follow.',
    metadata = jsonb_build_object(
      'track', 'social',
      'platformLabel', 'X',
      'targetUrl', 'https://x.com/EmoryaFinance',
      'proofType', 'screenshot',
      'proofInstructions', 'Submit a screenshot or profile link showing that you followed the official Emorya X account.',
      'submissionGuidance', jsonb_build_object(
        'evidence', jsonb_build_array('X profile screenshot', 'X profile link')
      ),
      'unlockRules', jsonb_build_object('all', jsonb_build_array()),
      'rewardConfig', jsonb_build_object(
        'xp', jsonb_build_object('base', 20, 'premiumMultiplierEligible', true),
        'tokenEffect', 'none'
      )
    ),
    updated_at = NOW()
WHERE slug = 'follow-emorya-on-x';
