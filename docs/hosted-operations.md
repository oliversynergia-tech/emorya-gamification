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
