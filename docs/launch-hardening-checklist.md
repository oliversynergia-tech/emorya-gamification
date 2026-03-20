# Launch Hardening Checklist

Use this checklist before treating the current app as a real production launch candidate.

Supporting references:

- [`docs/production-env-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-env-matrix.md)
- [`docs/scheduler-ownership-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/scheduler-ownership-matrix.md)

## 1. Environment

- [ ] `APP_URL` is set to the final production `https://` domain.
- [ ] `DATABASE_URL` points to the production PostgreSQL instance.
- [ ] `SESSION_SECRET` is long, unique, and production-only.
- [ ] `NEXT_PUBLIC_MULTIVERSX_CHAIN` matches the intended live chain.
- [ ] `MULTIVERSX_API_URL` uses the expected production endpoint.
- [ ] `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID` is set if wallet linking should work at launch.

## 2. Database And Release Gate

- [ ] `npm run ops:release:gate` passes in the target environment.
- [ ] `npm run ops:db:migrate:status` shows only applied migrations after rollout.
- [ ] the active economy settings row is valid for the chosen payout mode.
- [ ] at least one active reward program exists for the active payout asset.
- [ ] at least one admin user exists in `user_roles`.

## 3. Leaderboard And Scheduled Jobs

- [ ] `CRON_SNAPSHOTS_ENABLED=true` if the hosted environment is responsible for leaderboard history.
- [ ] `npm run ops:db:snapshot:scheduled` is wired into the real scheduler if leaderboard movement should persist automatically.
- [ ] snapshot ownership is clear:
  - hosted cron / scheduler
  - or manual ops fallback
- [ ] campaign-pack report ownership is clear:
  - hosted scheduler
  - external scheduler
  - or intentionally disabled
- [ ] payout automation ownership is clear:
  - hosted scheduler
  - external scheduler
  - or intentionally manual/review-only

## 4. Payout Automation

- [ ] `AUTOMATION_ACTOR_USER_ID` is set before enabling `automation_ready` payout mode.
- [ ] `PAYOUT_AUTOMATION_MAX_RETRIES` is set to the intended escalation threshold.
- [ ] payout mode matches actual operating readiness:
  - `manual`
  - `review_required`
  - `automation_ready`
- [ ] someone has reviewed the hold / fail / requeue recovery path in admin.

## 5. Campaign Ops

- [ ] campaign-pack alert routes are configured in admin for live-pack monitoring.
- [ ] campaign benchmarks are reviewed for the active lane mix.
- [ ] any flagship pack overrides are intentional and documented.
- [ ] recurring partner report generation is either:
  - scheduled intentionally
  - or disabled intentionally

## 6. Reporting And Partner Deliverables

- [ ] `CAMPAIGN_PACK_REPORT_OUTPUT_DIR` points to persistent storage if scheduled reports are enabled.
- [ ] partner report exports have been smoke-tested from production-like data.
- [ ] the PDF/print view has been reviewed for external readability.

## 7. Operational Safety

- [ ] moderation alert routes are configured if moderation operations are expected to be monitored in production.
- [ ] queue-health warnings are reviewed in admin.
- [ ] payout exception workflow is reviewed in admin.
- [ ] campaign-pack alert suppressions and acknowledgements are working as expected.

## 8. Product Smoke Test

- [ ] sign up works.
- [ ] sign in works.
- [ ] wallet-link flow works.
- [ ] quest submission works.
- [ ] mission routing lands on the expected mission surface.
- [ ] admin loads without missing critical data.
- [ ] leaderboard, profile, and dashboard all load against the target database.

Use the step-by-step runbook here:

- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)

## 9. Current Known Manual Items

At the time of this checklist, these are the main items that still need explicit production attention rather than more code:

- [ ] switch `APP_URL` from local/non-production to the final production `https://` domain
- [ ] enable `CRON_SNAPSHOTS_ENABLED=true` if production owns leaderboard snapshots
- [ ] confirm scheduler ownership for:
  - leaderboard snapshots
  - campaign-pack reports
  - payout automation
- [ ] set production values for wallet-connect and payout automation envs before enabling those paths

Track current readiness here:

- [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)

## Definition Of Ready

Treat launch hardening as complete when:

- the release gate passes in the target environment
- all scheduled ownership is explicit
- the core product smoke test passes
- admin monitoring and payout recovery paths are confirmed
- no known production warning is being ignored by accident
