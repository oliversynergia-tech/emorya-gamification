# Launch Status

Use this as the live handoff/status board while preparing production launch.

## Current Release Posture

- Product state: campaign / mission / reporting layer complete for this phase
- Release posture: launch hardening in progress
- Current default recommendation: do not call production launch-ready until the checklist below is complete

## Current Blocking Items

- [ ] `APP_URL` is still using a non-production/local value and must be switched to the final `https://` domain.
- [ ] `CRON_SNAPSHOTS_ENABLED` still needs an explicit production decision:
  - enabled in hosted production
  - or owned by an external/manual scheduler
- [ ] scheduler ownership still needs explicit confirmation for:
  - leaderboard snapshots
  - campaign-pack reports
  - payout automation runs
- [ ] payout automation should not be treated as production-ready until:
  - `AUTOMATION_ACTOR_USER_ID` is set
  - `PAYOUT_AUTOMATION_MAX_RETRIES` is confirmed
  - the intended payout mode is confirmed

## Current Non-Blocking But Important

- [ ] wallet-connect production config should be confirmed before public launch if wallet linking is part of the launch promise
- [ ] partner report output storage should be confirmed if recurring report generation is enabled
- [ ] admin monitoring routes should be reviewed once against the production environment

## Scheduler Ownership

- Leaderboard snapshots: [ ] hosted scheduler [ ] external scheduler [ ] manual fallback
- Campaign-pack reports: [ ] hosted scheduler [ ] external scheduler [ ] disabled intentionally
- Payout automation: [ ] hosted scheduler [ ] external scheduler [ ] manual/review-only mode

## Launch Owner And Decision Log

- Launch owner: [ ] assigned
- Final go/no-go approver: [ ] assigned
- Last checklist review date: [ ] recorded
- Last smoke-test run date: [ ] recorded
- Notes:
  - [ ] blocker decision recorded for `APP_URL`
  - [ ] blocker decision recorded for snapshot ownership
  - [ ] blocker decision recorded for payout automation ownership

## Go / No-Go

- [ ] release gate passes in the target environment
- [ ] smoke-test runbook passes against the target environment
- [ ] all blocking items above are cleared
- [ ] launch owner is comfortable calling the environment production-ready

## Related Docs

- [`docs/launch-hardening-checklist.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-hardening-checklist.md)
- [`docs/production-smoke-test-runbook.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-smoke-test-runbook.md)
- [`docs/production-env-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/production-env-matrix.md)
- [`docs/scheduler-ownership-matrix.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/scheduler-ownership-matrix.md)
- [`docs/release-procedure.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/release-procedure.md)
