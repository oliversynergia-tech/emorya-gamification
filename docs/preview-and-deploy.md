# Preview And Deploy

## Local preview

Use this when you want the fastest feedback loop while building:

```bash
cd "/Users/olivermills/Documents/Emorya Gamify/emorya-gamification"
npm run dev
```

Open:

- `http://localhost:3000`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/achievements`
- `http://localhost:3000/leaderboard`
- `http://localhost:3000/profile`
- `http://localhost:3000/admin`

Keep the terminal open while previewing. Stop the server with `Control + C`.

## Production-like local preview

Use this when you want to check the built app, not the hot-reload dev server:

```bash
cd "/Users/olivermills/Documents/Emorya Gamify/emorya-gamification"
npm run build
npm run start
```

This runs the optimized Next.js production server locally on `http://localhost:3000`.

## Before sharing a build

Run this sequence first:

```bash
npm run test
npm run lint
npm run build
```

That verifies:

- automated logic tests pass
- lint is clean
- the app compiles as a production build

## Environment checklist

At minimum, the app expects these values for a real preview/deployment:

- `APP_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_MULTIVERSX_CHAIN`

For wallet linking through xPortal:

- `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID`
- `MULTIVERSX_API_URL`

For moderation alert routing in production:

- `MODERATION_ALERT_STALE_MINUTES`
- `MODERATION_ALERT_OLDEST_WARNING_MINUTES`
- `MODERATION_ALERT_BACKLOG_WARNING_COUNT`
- `MODERATION_ALERT_BACKLOG_CRITICAL_COUNT`
- `MODERATION_ALERT_AVERAGE_WARNING_MINUTES`
- `MODERATION_ALERT_INBOX_ENABLED`
- one or more of:
  - `MODERATION_ALERT_EMAIL_TO`
  - `MODERATION_ALERT_SLACK_WEBHOOK_URL`
  - `MODERATION_ALERT_DISCORD_WEBHOOK_URL`
  - `MODERATION_ALERT_WEBHOOK_URL`

Use [`.env.example`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/.env.example) as the source template.

## Shareable preview workflow

1. Commit your work locally.
2. Push to GitHub:

```bash
git push origin main
```

3. Connect the GitHub repo to your preferred Next.js hosting platform.
4. Add the required environment variables in that host.
5. Point `DATABASE_URL` at a deployed PostgreSQL instance, not your local database.
6. Trigger a deployment from `main` or from a preview branch.

## Deployment checklist

Before a real hosted deployment, make sure:

- database migrations have been applied before traffic is switched
- seed data is only used in non-production environments
- `APP_URL` matches the deployed domain
- `SESSION_SECRET` is long and unique
- snapshot commands are either run manually or scheduled somewhere
- at least one admin user has a row in `user_roles`
- moderation alert thresholds and at least one delivery route are configured if the admin queue is expected to be monitored in production

## Recommended release flow

For the current repo, the cleanest repeatable flow is:

1. Build locally with `npm run test && npm run lint && npm run build`
2. Push to GitHub
3. Run the release gate in the target environment with `npm run ops:release:gate`
4. Deploy the app
5. Run snapshot jobs if the environment is meant to power leaderboard history immediately with `npm run ops:db:snapshot:scheduled`

## Release procedure

Treat migrations as a release gate, not a follow-up task.

Recommended order:

1. deploy or open the release artifact
2. run `npm run ops:release:gate` against the target environment
3. confirm env checks, migrations, migration status, quest validation, and release-state validation all pass
4. only then switch traffic to the new app version

If step 3 fails:

- do not continue the rollout
- fix the migration issue or revert the release candidate
- rerun the release gate before retrying deployment

This keeps schema changes inside the release procedure instead of relying on a manual post-deploy memory step.

The release-state check also blocks deploy if:

- the active economy settings row is malformed
- campaign override keys are incomplete
- premium multiplier ordering is invalid
- settlement-specific columns or required migrations are missing

## If you only want a quick stakeholder walkthrough

Use this:

1. `npm run dev`
2. open the app locally
3. capture screenshots or a screen recording
4. push the branch only after the walkthrough changes are stable

This is simpler than deploying every small UI adjustment.

## Scheduled operations

If the environment should maintain leaderboard movement properly after deploy, schedule:

```bash
npm run ops:db:snapshot:scheduled
```

The detailed scheduling guidance lives in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/docs/snapshot-scheduling.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/snapshot-scheduling.md), and hosted command usage is documented in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/docs/hosted-operations.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/hosted-operations.md).
