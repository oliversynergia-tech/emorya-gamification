# Campaign Pack Reporting

Use the partner report export script when you want a scheduled or ops-driven snapshot of live campaign pack performance.

## Commands

- `npm run dev:campaign-packs:report`
- `npm run ops:campaign-packs:report`
- `npm run ops:campaign-packs:report:scheduled`

Optional output directory:

- `npm run ops:campaign-packs:report -- --output-dir reports/partners`

## Output

The script writes two files:

- `campaign-pack-report-YYYY-MM-DD.csv`
- `campaign-pack-report-YYYY-MM-DD.html`

The HTML file is designed for browser print-to-PDF export.

## Notes

- The report is partner-facing and intentionally concise.
- It uses current live pack rollup metrics:
  - participants
  - approved completions
  - wallet-link rate
  - premium conversion
  - average weekly XP
  - benchmark lane/status
- It is safe to schedule via cron or any existing job runner.
- The script reads `.env.local` locally and standard environment variables in hosted environments.
- Use a persistent output directory in hosted ops so weekly CSV/HTML exports are retained outside ephemeral build artifacts.

## Example cron

```cron
0 9 * * 1 cd /path/to/emorya-gamification && npm run ops:campaign-packs:report -- --output-dir reports/weekly
```

## Hosted scheduling guidance

Recommended pattern:

1. Run the command from the same deployed environment that has database access.
2. Write reports to a persistent volume or mounted storage path.
3. Pair the schedule with the admin campaign alert routing so weak live packs trigger both:
   - routed alerts in admin
   - recurring partner-facing performance exports

Suggested weekly cadence:

- Monday morning for partner snapshots
- additional mid-week run for active launch windows if needed

## Scheduled wrapper

If you want one stable job-runner command, use:

```bash
npm run ops:campaign-packs:report:scheduled
```

It reads:

- `CAMPAIGN_PACK_REPORTS_ENABLED`
- `CAMPAIGN_PACK_REPORT_OUTPUT_DIR`

So hosted ops can schedule one command and manage the output path in env/config instead of editing the cron line each time.

## GitHub Actions option

The repo now includes:

- [`.github/workflows/campaign-pack-reports.yml`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/.github/workflows/campaign-pack-reports.yml)

It runs weekly and on manual dispatch. To use it, set repository secrets for:

- `DATABASE_URL`
- optional `DATABASE_SSL`

The workflow uploads the generated CSV/HTML files as build artifacts.
