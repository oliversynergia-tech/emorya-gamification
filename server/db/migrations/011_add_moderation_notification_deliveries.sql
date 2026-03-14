CREATE TABLE IF NOT EXISTS moderation_notification_deliveries (
  id UUID PRIMARY KEY,
  channel TEXT NOT NULL CHECK (channel IN ('inbox', 'webhook', 'email', 'slack', 'discord')),
  event_status TEXT NOT NULL CHECK (event_status IN ('armed', 'sent', 'acknowledged')),
  destination TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_notification_deliveries_created_at
  ON moderation_notification_deliveries(created_at DESC);
