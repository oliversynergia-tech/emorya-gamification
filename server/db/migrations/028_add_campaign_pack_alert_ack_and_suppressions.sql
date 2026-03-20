ALTER TABLE campaign_pack_alert_deliveries
  DROP CONSTRAINT IF EXISTS campaign_pack_alert_deliveries_event_status_check;

ALTER TABLE campaign_pack_alert_deliveries
  ADD CONSTRAINT campaign_pack_alert_deliveries_event_status_check
  CHECK (event_status IN ('armed', 'sent', 'acknowledged'));

ALTER TABLE campaign_pack_alert_deliveries
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

ALTER TABLE campaign_pack_alert_deliveries
  ADD COLUMN IF NOT EXISTS acknowledged_by UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS campaign_pack_alert_suppressions (
  id UUID PRIMARY KEY,
  pack_id TEXT NOT NULL,
  label TEXT NOT NULL,
  title TEXT NOT NULL,
  suppressed_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES users(id),
  cleared_at TIMESTAMPTZ,
  cleared_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pack_alert_suppressions_active
  ON campaign_pack_alert_suppressions(pack_id, title, suppressed_until DESC);
