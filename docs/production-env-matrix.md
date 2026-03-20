# Production Env Matrix

Use this to decide which env vars are truly required for launch versus only needed for specific features.

## Core Launch

These should be treated as required for any real production launch:

- `APP_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_MULTIVERSX_CHAIN`
- `NODE_ENV=production`

Production blocker policy:

- `APP_URL` must use `https://`
- scheduler ownership must be declared explicitly through:
  - `LEADERBOARD_SNAPSHOT_OWNER`
  - `CAMPAIGN_PACK_REPORT_OWNER`
  - `PAYOUT_AUTOMATION_OWNER`

## Required When Using Wallet Linking

- `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID`
- `MULTIVERSX_API_URL`

## Required When Hosted Production Owns Leaderboard Snapshots

- `LEADERBOARD_SNAPSHOT_OWNER=hosted`
- `CRON_SNAPSHOTS_ENABLED=true`

If leaderboard snapshots are owned elsewhere:

- `LEADERBOARD_SNAPSHOT_OWNER=external`
- or `LEADERBOARD_SNAPSHOT_OWNER=manual`

## Required When Hosted Production Owns Campaign-Pack Reports

- `CAMPAIGN_PACK_REPORT_OWNER=hosted`
- `CAMPAIGN_PACK_REPORTS_ENABLED=true`
- `CAMPAIGN_PACK_REPORT_OUTPUT_DIR=<persistent-path>`

If campaign-pack reports are owned elsewhere or intentionally off:

- `CAMPAIGN_PACK_REPORT_OWNER=external`
- or `CAMPAIGN_PACK_REPORT_OWNER=disabled`

## Required When Hosted Production Owns Payout Automation

- `PAYOUT_AUTOMATION_OWNER=hosted`
- `AUTOMATION_ACTOR_USER_ID`
- `PAYOUT_AUTOMATION_MAX_RETRIES`

If payout automation is not hosted in this app environment:

- `PAYOUT_AUTOMATION_OWNER=external`
- or `PAYOUT_AUTOMATION_OWNER=manual`

## Operational Monitoring

Moderation routing when moderation ops are expected to be monitored:

- `MODERATION_ALERT_STALE_MINUTES`
- `MODERATION_ALERT_OLDEST_WARNING_MINUTES`
- `MODERATION_ALERT_BACKLOG_WARNING_COUNT`
- `MODERATION_ALERT_BACKLOG_CRITICAL_COUNT`
- `MODERATION_ALERT_AVERAGE_WARNING_MINUTES`
- `MODERATION_ALERT_INBOX_ENABLED`

Optional but recommended destinations:

- `MODERATION_ALERT_EMAIL_TO`
- `MODERATION_ALERT_SLACK_WEBHOOK_URL`
- `MODERATION_ALERT_DISCORD_WEBHOOK_URL`
- `MODERATION_ALERT_WEBHOOK_URL`

## Notes

- This matrix is meant to complement, not replace:
  - [`docs/launch-hardening-checklist.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-hardening-checklist.md)
  - [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)
  - [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)
