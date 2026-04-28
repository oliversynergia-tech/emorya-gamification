UPDATE quest_definitions
SET verification_type = 'completion-check',
    metadata = (metadata - 'targetUrl' - '_urlNote') || '{
      "ctaLabel": "Confirm Activation",
      "completionCheckSlugs": [
        "download-the-emorya-app",
        "open-the-app-for-the-first-time",
        "create-emorya-account",
        "complete-your-profile",
        "confirm-your-starter-setup",
        "complete-daily-wheel-spin",
        "play-emoryan-adventure-game",
        "download-xportal",
        "open-or-create-your-xportal-wallet",
        "connect-your-xportal-wallet",
        "view-your-emrs-reward-path",
        "convert-your-first-calories"
      ]
    }'::jsonb,
    updated_at = NOW()
WHERE slug = 'complete-the-full-activation-ladder';
