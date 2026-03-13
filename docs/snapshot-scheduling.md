# Snapshot Scheduling

## Purpose

Leaderboard movement depends on stored snapshot rows, not just live XP totals.

The repo now supports two modes:

- manual one-off snapshot writes
- a scheduled batch command that writes all current leaderboard periods at once

## Batch command

Run all snapshot periods for today:

```bash
cd "/Users/olivermills/Documents/Emorya Gamify/emorya-gamification"
npm run dev:db:snapshot:scheduled
```

This writes:

- `all-time`
- `referral`
- `weekly`
- `monthly`

Run all snapshot periods for a specific date:

```bash
node scripts/dev.mjs snapshot-scheduled 2026-03-13
```

## Individual commands

Use these if you only want one period:

```bash
npm run dev:db:snapshot:all-time
npm run dev:db:snapshot:referral
npm run dev:db:snapshot:weekly
npm run dev:db:snapshot:monthly
```

## Recommended schedule

For a hosted environment, the safest default is:

- run `all-time` and `referral` daily
- run `weekly` once per week at the start of the reporting week
- run `monthly` once per month at the start of the reporting month

If you want one simple operational rule, run the batch command daily and let snapshots upsert by date.

## Hosting examples

### Cron on a server or VM

Example daily batch run:

```cron
0 0 * * * cd /path/to/emorya-gamification && npm run dev:db:snapshot:scheduled
```

### Vercel / hosted job runner

Use a scheduled job that runs:

```bash
npm run ops:db:snapshot:scheduled
```

with the same environment variables as the app.

### Railway / container worker

Create a small scheduled worker or cron service that runs:

```bash
npm run ops:db:snapshot:scheduled
```

## Requirements

The snapshot command requires:

- `DATABASE_URL`
- optional `DATABASE_SSL=true|false`

## Operational note

The command is idempotent for the same date and period because it upserts on:

- `user_id`
- `period`
- `snapshot_date`

That means rerunning the same scheduled command for the same day is safe.
