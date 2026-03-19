CREATE TABLE IF NOT EXISTS campaign_pack_alert_deliveries (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('inbox', 'webhook', 'email', 'slack', 'discord')),
  event_status TEXT NOT NULL CHECK (event_status IN ('armed', 'sent')),
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pack_alert_deliveries_created_at
  ON campaign_pack_alert_deliveries(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_campaign_pack_alert_deliveries_fingerprint
  ON campaign_pack_alert_deliveries(channel, event_status, fingerprint);
