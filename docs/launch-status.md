# Launch Status

Use this as the live handoff/status board while preparing production launch.

## Current Release Posture

- Product state: Emorya launch candidate is feature-complete and in refinement / QA / launch-ops mode
- Release posture: local launch candidate is stable; production setup and hosted smoke test still remain
- Current default recommendation: do not call production launch-ready until the checklist below is complete

## Launch Freeze Decisions

These are the active launch decisions for the first Emorya release and should be treated as the baseline unless an explicit change is approved.

- Progression posture
  - launch is XP-first
  - quest cards should show clean quest XP values
  - progression remains the main user-facing reward language
- Redemption posture
  - token redemption remains disabled at launch
  - payout/reward redemption should stay manual / review-first until a separate go-live decision is recorded
- Social quest posture
  - launch social quests use `manual-review`
  - no live quest should rely on `social-oauth` until that flow is fully implemented
- Brand posture
  - Emorya is the default published skin for launch
  - xPortal and MultiversX skins remain available as reskinnable variants, but are not the launch default
- Admin posture
  - there is no public admin entry in the user-facing UI
  - public `/admin` remains dead
  - the live admin entry is the hidden control-room path
  - only `super_admin` users can grant or revoke admin access
  - standard `admin` users can moderate and review submissions, but cannot manage admin grants
- Launch URL posture
  - preferred launch route is a dedicated subdomain such as `gravity.emorya.com`
  - the main Emorya website can link into the platform, but the platform should launch as its own app surface

## Current Product Launch Baseline

- Default skin: `emorya`
- Hidden admin path: `/control-room-r7k9m2`
- Public admin path: `/admin` returns not found
- Reward mode: XP-first
- Redemption mode: disabled
- Social launch quests: manual review
- Admin grant model: `super_admin` only
- Review / moderation path: hidden admin control room + review queue
- Local launch candidate status: reviewed and stable enough to prepare production setup

## Recommended Launch Decision Profile

- `APP_URL`
  - production must use the final hosted `https://` domain
  - preferred shape: dedicated subdomain such as `https://gravity.emorya.com`
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
- [ ] the hidden admin URL and first `super_admin` owners should be recorded in the internal ops handoff

## Scheduler Ownership

- Leaderboard snapshots: [x] hosted scheduler [ ] external scheduler [ ] manual fallback
- Campaign-pack reports: [x] hosted scheduler [ ] external scheduler [ ] disabled intentionally
- Payout automation: [ ] hosted scheduler [ ] external scheduler [x] manual/review-only mode

## Launch Owner And Decision Log

- Launch owner: Product / platform lead
- Final go/no-go approver: Product owner with operations sign-off
- Last checklist review date: 2026-04-18
- Last smoke-test run date: 2026-04-18
- Notes:
  - [x] blocker decision recorded for `APP_URL`
  - [x] blocker decision recorded for snapshot ownership
  - [x] blocker decision recorded for payout automation ownership
  - [x] recommended launch mode recorded for payout automation as manual/review-first
  - [x] XP-first launch posture recorded
  - [x] redemption-disabled launch posture recorded
  - [x] manual-review launch posture recorded for social quests
  - [x] hidden admin route recorded
  - [x] admin grant model tightened to `super_admin` only

## Smoke-Test Record

- 2026-03-22
  - environment: local production-like validation
  - result: pass
  - notes:
    - release gate passed
    - route smoke covered `/`, `/auth`, `/dashboard`, `/leaderboard`, `/profile`, and `/admin`
    - final hosted smoke run is still required before public launch
- 2026-04-18
  - environment: local launch-candidate validation
  - result: pass
  - notes:
    - signed-out / first-time-user pass completed
    - dashboard, profile, leaderboard, achievements, and auth layouts were tightened
    - launch social quests now use manual review instead of unsupported `social-oauth`
    - hidden admin path is active and public `/admin` remains dead
    - admin grant / revoke is now restricted to `super_admin`

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
