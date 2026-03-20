ALTER TABLE economy_settings
ADD COLUMN IF NOT EXISTS campaign_alert_channels JSONB NOT NULL DEFAULT '{"inboxEnabled": true}'::JSONB;
