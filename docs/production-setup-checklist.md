# Production Setup Checklist

Use this when you are ready to move from the local launch candidate to a real hosted Emorya platform.

This is the plain-English version. It is intentionally practical and non-technical.

## Goal

Get the platform live at a hosted URL, with the right database, the right environment settings, the right admin access, and one final smoke test before go-live.

Recommended launch shape:

- main website stays on `emorya.com`
- platform launches on a dedicated subdomain such as `gravity.emorya.com`
- the main site links into the platform

## What You Need Before You Start

Have these ready first:

- access to the code repository
- access to the hosting platform
- access to the DNS/domain settings for `emorya.com`
- access to the production database provider
- one normal test account
- one admin account
- one `super_admin` account

If wallet linking is part of launch, also have:

- a WalletConnect / Reown project ID
- a test wallet available for the final smoke test

## Step 1. Choose The Hosted URL

Recommended:

- `gravity.emorya.com`

Why this is the preferred route:

- it is easier to deploy than `emorya.com/gravity`
- it is easier to isolate and test
- it avoids path-routing problems
- it still feels like part of Emorya when linked from the main site

## Step 2. Set Up Hosting

Create or connect the app on your hosting provider.

Typical examples:

- Vercel
- Railway
- Render

What you need the host to do:

- deploy the Next.js app
- connect the GitHub repo
- let you add environment variables
- let you attach the custom subdomain

## Step 3. Connect The Production Database

Create or choose the production PostgreSQL database and connect it to the app.

What this means in practice:

- the hosted app should use the production `DATABASE_URL`
- the production app should not point at a local database

Before calling anything live, make sure:

- the production database is reachable
- migrations can run against it
- it will hold the real launch data

## Step 4. Add The Core Environment Variables

At minimum, set these in the hosting dashboard:

- `APP_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_MULTIVERSX_CHAIN`
- `NODE_ENV=production`

Recommended launch value for `APP_URL`:

- `https://gravity.emorya.com`

If wallet linking is part of launch, also set:

- `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID`
- `MULTIVERSX_API_URL`

For launch ownership, set:

- `LEADERBOARD_SNAPSHOT_OWNER=hosted`
- `CAMPAIGN_PACK_REPORT_OWNER=hosted`
- `PAYOUT_AUTOMATION_OWNER=manual`
- `CRON_SNAPSHOTS_ENABLED=true`

## Step 5. Attach The Subdomain

In the hosting platform:

- add the custom domain `gravity.emorya.com`

In the Emorya DNS/domain settings:

- add the record the hosting provider asks for

Once DNS updates propagate, the hosted app should open on:

- `https://gravity.emorya.com`

## Step 6. Run The Release Gate

Before public launch, the hosted environment needs to pass the release checks.

Run:

```bash
npm run ops:release:gate
```

Then check migration status:

```bash
npm run ops:db:migrate:status
```

What you want here:

- no migration errors
- no release-state errors
- no missing required environment values

## Step 7. Confirm The Launch Posture

The first Emorya launch should use this posture:

- XP-first progression
- token redemption disabled
- social launch quests on manual review
- Emorya as the default skin
- public `/admin` kept dead
- hidden admin control room used for moderation
- only `super_admin` can grant or revoke admin access

This launch posture is recorded here:

- [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)

## Step 8. Confirm Admin Access

Before go-live, confirm you have:

- at least one `super_admin`
- at least one `admin`

Remember:

- users first create a normal account
- a `super_admin` then grants admin access to that existing account
- standard `admin` users can review and moderate
- only `super_admin` users can grant or revoke admin access

Hidden admin entry:

- `/control-room-r7k9m2`

Public `/admin` should remain unavailable.

## Step 9. Run The Hosted Smoke Test

Use the real hosted URL and click through the core journey.

Check:

- home loads
- auth works
- sign up works
- sign in works
- dashboard loads
- profile loads
- leaderboard loads
- achievements loads
- quest submission works
- wallet linking works if part of launch
- hidden admin route works for admins
- public `/admin` stays dead

Use the full runbook here:

- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)

## Step 10. Link The Main Website To The Platform

On `emorya.com`, add a clear entry point such as:

- `Gravity`
- `Launch platform`
- the final confirmed product name

That link should point to:

- `https://gravity.emorya.com`

This keeps the platform connected to the main site without forcing a more fragile `/gravity` path deployment.

## Step 11. Make The Go / No-Go Decision

You are ready to call the platform production-ready when:

- the hosted app is live on the final URL
- the release gate passes
- the smoke test passes
- admin access is confirmed
- the launch posture matches the agreed baseline

## Related Docs

- [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)
- [`docs/launch-hardening-checklist.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-hardening-checklist.md)
- [`docs/production-env-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-env-matrix.md)
- [`docs/preview-and-deploy.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/preview-and-deploy.md)
- [`docs/hosted-operations.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/hosted-operations.md)
- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)
