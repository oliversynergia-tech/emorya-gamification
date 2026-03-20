CREATE TABLE IF NOT EXISTS campaign_pack_audit (
  id UUID PRIMARY KEY,
  pack_id TEXT NOT NULL,
  label TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN (
    'create_pack',
    'update_lifecycle',
    'save_benchmark_override',
    'clear_benchmark_override',
    'suppress_alert',
    'clear_alert_suppression'
  )),
  detail TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_campaign_pack_audit_created_at
  ON campaign_pack_audit(created_at DESC);
