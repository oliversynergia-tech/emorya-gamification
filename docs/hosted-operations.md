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

Validate deploy-time environment assumptions:

```bash
npm run ops:env:check
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

Unlike the local workflow, these commands are intended for CI, cron runners, and hosted job environments.

## Recommended hosted usage

- release step: `npm run ops:db:migrate`
- pre-release env validation: `npm run ops:env:check`
- post-deploy verification: `npm run ops:db:migrate:status`
- scheduled leaderboard maintenance: `npm run ops:db:snapshot:scheduled`
