# Scheduler Ownership Matrix

Use this to make scheduler responsibility explicit before production launch.

## Leaderboard Snapshots

- declared with `LEADERBOARD_SNAPSHOT_OWNER`
- `hosted`
  - the deployed app environment runs `npm run ops:db:snapshot:scheduled`
  - requires `CRON_SNAPSHOTS_ENABLED=true`
- `external`
  - another job runner or platform owns leaderboard snapshots
- `manual`
  - snapshots are run manually as an operational fallback

## Campaign-Pack Reports

- declared with `CAMPAIGN_PACK_REPORT_OWNER`
- `hosted`
  - the deployed app environment runs `npm run ops:campaign-packs:report:scheduled`
  - requires persistent report storage
- `external`
  - another scheduler or workflow owns report generation
- `disabled`
  - recurring partner reports are intentionally off

## Payout Automation

- declared with `PAYOUT_AUTOMATION_OWNER`
- `hosted`
  - the deployed app environment runs payout automation jobs
  - requires `AUTOMATION_ACTOR_USER_ID`
  - requires `PAYOUT_AUTOMATION_MAX_RETRIES`
- `external`
  - payout automation runs elsewhere
- `manual`
  - payout handling remains manual / review-driven

## Recommended Launch Rule

Do not leave ownership implicit.

Before launch, every one of these should have one explicit owner:

- leaderboard snapshots
- campaign-pack reports
- payout automation

Track the current choice in:

- [`docs/launch-status.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/launch-status.md)
