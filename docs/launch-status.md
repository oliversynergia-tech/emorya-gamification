# Launch Status

Use this as the live handoff/status board while preparing production launch.

## Current Release Posture

- Product state: campaign / mission / reporting layer complete for this phase
- Release posture: launch hardening stable enough to begin theme-system work
- Current default recommendation: do not call production launch-ready until the checklist below is complete

## Recommended Launch Decision Profile

- `APP_URL`
  - production must use the final hosted `https://` domain
  - local/non-production values remain acceptable only outside production
- Leaderboard snapshots
  - recommended launch owner: hosted scheduler
  - matching env expectation: `LEADERBOARD_SNAPSHOT_OWNER=hosted`
  - hosted launch expectation: `CRON_SNAPSHOTS_ENABLED=true`
- Campaign-pack reports
  - recommended launch owner: hosted scheduler
  - matching env expectation: `CAMPAIGN_PACK_REPORT_OWNER=hosted`
- Payout automation
  - recommended launch owner: manual / review-first for the initial launch
  - matching env expectation: `PAYOUT_AUTOMATION_OWNER=manual`
  - if hosted later, require `AUTOMATION_ACTOR_USER_ID` and confirmed retry policy

## Current Blocking Items

- [ ] `APP_URL` is still using a non-production/local value and must be switched to the final `https://` domain.
- [ ] the real production env still needs the recorded ownership values applied:
  - `LEADERBOARD_SNAPSHOT_OWNER=hosted`
  - `CAMPAIGN_PACK_REPORT_OWNER=hosted`
  - `PAYOUT_AUTOMATION_OWNER=manual`
- [ ] the target hosted environment still needs the smoke-test runbook executed after deployment
- [ ] payout automation should remain manual/review-first until an explicit automation go-live decision is recorded

## Current Non-Blocking But Important

- [ ] wallet-connect production config should be confirmed before public launch if wallet linking is part of the launch promise
- [ ] partner report output storage should be confirmed if recurring report generation is enabled
- [ ] admin monitoring routes should be reviewed once against the production environment

## Scheduler Ownership

- Leaderboard snapshots: [x] hosted scheduler [ ] external scheduler [ ] manual fallback
- Campaign-pack reports: [x] hosted scheduler [ ] external scheduler [ ] disabled intentionally
- Payout automation: [ ] hosted scheduler [ ] external scheduler [x] manual/review-only mode

## Launch Owner And Decision Log

- Launch owner: Product / platform lead
- Final go/no-go approver: Product owner with operations sign-off
- Last checklist review date: 2026-03-22
- Last smoke-test run date: 2026-03-22
- Notes:
  - [x] blocker decision recorded for `APP_URL`
  - [x] blocker decision recorded for snapshot ownership
  - [x] blocker decision recorded for payout automation ownership
  - [x] recommended launch mode recorded for payout automation as manual/review-first

## Smoke-Test Record

- 2026-03-22
  - environment: local production-like validation
  - result: pass
  - notes:
    - release gate passed
    - route smoke covered `/`, `/auth`, `/dashboard`, `/leaderboard`, `/profile`, and `/admin`
    - final hosted smoke run is still required before public launch

## Go / No-Go

- [ ] release gate passes in the target environment
- [ ] smoke-test runbook passes against the final hosted environment
- [ ] all blocking items above are cleared in production config
- [ ] launch owner is comfortable calling the environment production-ready

## Related Docs

- [`docs/launch-hardening-checklist.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-hardening-checklist.md)
- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)
- [`docs/production-env-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-env-matrix.md)
- [`docs/scheduler-ownership-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/scheduler-ownership-matrix.md)
- [`docs/ui-structure-freeze.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/ui-structure-freeze.md)
- [`docs/brand-theme-architecture.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/brand-theme-architecture.md)
- [`docs/release-procedure.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/release-procedure.md)
