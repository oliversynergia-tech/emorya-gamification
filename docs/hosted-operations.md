# Hosted Operations

Use these commands in deployed or CI-style environments where you want database operations without relying on the local dev naming.

## Commands

Run pending migrations:

```bash
npm run ops:db:migrate
```

Show migration status:

```bash
npm run ops:db:migrate:status
```

Validate structured quest metadata:

```bash
npm run ops:db:validate:quests
```

Validate deploy-time environment assumptions:

```bash
npm run ops:env:check
```

Validate deploy-blocking product state:

```bash
npm run ops:release:state-check
```

Run the full release gate:

```bash
npm run ops:release:gate
```

Write all leaderboard snapshots for the current date:

```bash
npm run ops:db:snapshot:scheduled
```

Or run a specific dated batch:

```bash
node scripts/ops.mjs snapshot-scheduled 2026-03-14
```

## Environment requirements

- `DATABASE_URL`
- optional `DATABASE_SSL=true|false`

For moderation alerting in hosted environments:

- `MODERATION_ALERT_STALE_MINUTES`
- `MODERATION_ALERT_OLDEST_WARNING_MINUTES`
- `MODERATION_ALERT_BACKLOG_WARNING_COUNT`
- `MODERATION_ALERT_BACKLOG_CRITICAL_COUNT`
- `MODERATION_ALERT_AVERAGE_WARNING_MINUTES`
- `MODERATION_ALERT_INBOX_ENABLED`

Optional outbound destinations:

- `MODERATION_ALERT_EMAIL_TO`
- `MODERATION_ALERT_SLACK_WEBHOOK_URL`
- `MODERATION_ALERT_DISCORD_WEBHOOK_URL`
- `MODERATION_ALERT_WEBHOOK_URL`

Unlike the local workflow, these commands are intended for CI, cron runners, and hosted job environments.

## Recommended hosted usage

- release step: `npm run ops:db:migrate`
- release gate: `npm run ops:release:gate`
- quest catalog validation: `npm run ops:db:validate:quests`
- pre-release env validation: `npm run ops:env:check`
- product-state validation: `npm run ops:release:state-check`
- post-deploy verification: `npm run ops:db:migrate:status`
- scheduled leaderboard maintenance: `npm run ops:db:snapshot:scheduled`

## Moderation alert routing

If the hosted environment is responsible for moderation operations, configure the queue thresholds and at least one outbound destination.

Recommended setup:

- inbox alerting on by default
- email recipient for human escalation
- Slack or Discord webhook for team visibility

Suggested pattern:

```env
MODERATION_ALERT_STALE_MINUTES=1440
MODERATION_ALERT_OLDEST_WARNING_MINUTES=360
MODERATION_ALERT_BACKLOG_WARNING_COUNT=8
MODERATION_ALERT_BACKLOG_CRITICAL_COUNT=15
MODERATION_ALERT_AVERAGE_WARNING_MINUTES=90
MODERATION_ALERT_INBOX_ENABLED=true
MODERATION_ALERT_EMAIL_TO=ops@emorya.com
MODERATION_ALERT_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

These settings drive the admin queue-health warnings and the outbound notification routing summary shown in the admin surface.

## Campaign pack alerts and campaign pack reports

Campaign-pack alert routing is configured in the admin economy settings now, not through the moderation env vars above.

Recommended setup:

- keep campaign inbox alerting on
- add an email recipient or team webhook in the economy settings panel for live pack benchmark breaches
- review the active route summary in the campaign operations section after saving

For recurring partner reporting in hosted environments, schedule:

- `npm run ops:campaign-packs:report -- --output-dir /persistent/reports/campaign-packs`
- or the env-driven wrapper: `npm run ops:campaign-packs:report:scheduled`

Suggested cadence:

- weekly for normal partner updates
- twice weekly during live acquisition pushes

The command writes:

- `campaign-pack-report-YYYY-MM-DD.csv`
- `campaign-pack-report-YYYY-MM-DD.html`

The HTML output is print-friendly and can be saved to PDF from a browser when needed.

Recommended env for the wrapper:

```env
CAMPAIGN_PACK_REPORTS_ENABLED=true
CAMPAIGN_PACK_REPORT_OUTPUT_DIR=/persistent/reports/campaign-packs
AUTOMATION_ACTOR_USER_ID=<user-id-with-super-admin-access>
PAYOUT_AUTOMATION_MAX_RETRIES=3
```

If GitHub Actions is part of the ops setup, the repo also includes a weekly workflow:

- [`.github/workflows/campaign-pack-reports.yml`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/.github/workflows/campaign-pack-reports.yml)

That path expects `DATABASE_URL` and optional `DATABASE_SSL` as repository secrets and uploads the generated reports as workflow artifacts.

## Launch hardening notes

Before switching production traffic:

- set `APP_URL` to the final `https://` domain
- set `CRON_SNAPSHOTS_ENABLED=true` if the hosted environment is responsible for leaderboard history
- set `AUTOMATION_ACTOR_USER_ID` before enabling `automation_ready` payout mode
- keep `CAMPAIGN_PACK_REPORT_OUTPUT_DIR` on persistent storage if scheduled report generation is enabled

Use the full checklist here before calling the environment launch-ready:

- [`docs/launch-hardening-checklist.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-hardening-checklist.md)
- [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)
- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)
- [`docs/production-env-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-env-matrix.md)
- [`docs/scheduler-ownership-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/scheduler-ownership-matrix.md)
