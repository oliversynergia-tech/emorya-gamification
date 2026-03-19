# Campaign Pack Reporting

Use the partner report export script when you want a scheduled or ops-driven snapshot of live campaign pack performance.

## Commands

- `npm run dev:campaign-packs:report`
- `npm run ops:campaign-packs:report`

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

## Example cron

```cron
0 9 * * 1 cd /path/to/emorya-gamification && npm run ops:campaign-packs:report -- --output-dir reports/weekly
```

