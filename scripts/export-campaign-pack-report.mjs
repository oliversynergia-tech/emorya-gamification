import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

async function loadEnvFile(filePath) {
  try {
    const contents = await fs.readFile(filePath, "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }
      const equalsIndex = trimmed.indexOf("=");
      if (equalsIndex <= 0) {
        continue;
      }
      const key = trimmed.slice(0, equalsIndex).trim();
      const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing env files.
  }
}

function getArg(flag, fallback = null) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] ?? fallback : fallback;
}

const outputDirArg = getArg("--output-dir", "reports");
const reportDate = new Date().toISOString().slice(0, 10);
const outputDir = path.resolve(process.cwd(), outputDirArg);
const csvPath = path.join(outputDir, `campaign-pack-report-${reportDate}.csv`);
const htmlPath = path.join(outputDir, `campaign-pack-report-${reportDate}.html`);

await loadEnvFile(path.resolve(process.cwd(), ".env.local"));
await loadEnvFile(path.resolve(process.cwd(), ".env"));

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to export campaign pack reports.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

try {
  const settingsResult = await pool.query(
    `SELECT differentiate_upstream_campaign_sources, campaign_pack_benchmarks
     FROM economy_settings
     WHERE is_active = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
  );
  const settingsRow = settingsResult.rows[0] ?? {
    differentiate_upstream_campaign_sources: false,
    campaign_pack_benchmarks: {},
  };
  const benchmarks = settingsRow.campaign_pack_benchmarks ?? {};

  const reportResult = await pool.query(
    `WITH participant_base AS (
       SELECT q.metadata->>'campaignPackId' AS pack_id,
              q.metadata->>'campaignPackLabel' AS pack_label,
              COALESCE(q.metadata->>'campaignPackState', CASE WHEN q.is_active THEN 'live' ELSE 'draft' END) AS lifecycle_state,
              COALESCE(q.metadata->>'campaignAttributionSource', 'direct') AS attribution_source,
              qc.user_id,
              COUNT(*) FILTER (WHERE qc.status = 'approved') OVER (PARTITION BY q.metadata->>'campaignPackId') AS approved_completions
       FROM quest_definitions q
       INNER JOIN quest_completions qc ON qc.quest_id = q.id
       WHERE q.metadata ? 'campaignPackId'
     ),
     weekly_xp AS (
       SELECT user_id, COALESCE(SUM(xp_earned), 0) AS weekly_xp
       FROM activity_log
       WHERE created_at >= NOW() - INTERVAL '7 days'
       GROUP BY user_id
     ),
     participant_rollup AS (
       SELECT base.pack_id,
              MIN(base.pack_label) AS pack_label,
              MIN(base.lifecycle_state) AS lifecycle_state,
              ARRAY_AGG(DISTINCT base.attribution_source ORDER BY base.attribution_source) AS sources,
              COUNT(DISTINCT base.user_id) AS participant_count,
              MAX(base.approved_completions) AS approved_completion_count,
              COUNT(DISTINCT base.user_id) FILTER (
                WHERE EXISTS (
                  SELECT 1
                  FROM user_identities ui
                  WHERE ui.user_id = base.user_id
                    AND ui.provider = 'multiversx'
                    AND ui.status = 'active'
                )
              ) AS wallet_linked_count,
              COUNT(DISTINCT base.user_id) FILTER (WHERE users.subscription_tier IN ('monthly', 'annual')) AS premium_count,
              AVG(COALESCE(weekly_xp.weekly_xp, 0)) AS average_weekly_xp
       FROM participant_base base
       INNER JOIN users ON users.id = base.user_id
       LEFT JOIN weekly_xp ON weekly_xp.user_id = base.user_id
       GROUP BY base.pack_id
     )
     SELECT *
     FROM participant_rollup
     ORDER BY participant_count DESC, approved_completion_count DESC`,
  );

  const rows = reportResult.rows.map((row) => {
    const participantCount = Number(row.participant_count ?? 0);
    const sources = Array.isArray(row.sources) ? row.sources : [];
    const dominantSource = sources[0] ?? "direct";
    const benchmarkLane =
      !settingsRow.differentiate_upstream_campaign_sources && (dominantSource === "galxe" || dominantSource === "taskon")
        ? "zealy"
        : dominantSource;
    const benchmark = benchmarks[benchmarkLane] ?? benchmarks.direct ?? {
      walletLinkRateTarget: 0,
      rewardEligibilityRateTarget: 0,
      premiumConversionRateTarget: 0,
      retainedActivityRateTarget: 0,
      averageWeeklyXpTarget: 0,
      zeroCompletionWeekThreshold: 1,
    };
    const walletLinkRate = participantCount > 0 ? Number(row.wallet_linked_count ?? 0) / participantCount : 0;
    const premiumConversionRate = participantCount > 0 ? Number(row.premium_count ?? 0) / participantCount : 0;
    const averageWeeklyXp = Number(row.average_weekly_xp ?? 0);
    const score =
      (walletLinkRate >= Number(benchmark.walletLinkRateTarget ?? 0) ? 1 : 0) +
      (premiumConversionRate >= Number(benchmark.premiumConversionRateTarget ?? 0) ? 1 : 0) +
      (averageWeeklyXp >= Number(benchmark.averageWeeklyXpTarget ?? 0) ? 1 : 0);
    const benchmarkStatus = score >= 3 ? "on_track" : score >= 2 ? "mixed" : "off_track";

    return {
      packId: row.pack_id,
      label: row.pack_label ?? row.pack_id,
      lifecycleState: row.lifecycle_state,
      sources,
      benchmarkLane,
      benchmarkStatus,
      participantCount,
      approvedCompletionCount: Number(row.approved_completion_count ?? 0),
      walletLinkRate,
      premiumConversionRate,
      averageWeeklyXp,
      partnerSummaryHeadline:
        benchmarkStatus === "on_track"
          ? "Pack is meeting the current lane benchmarks."
          : benchmarkStatus === "mixed"
            ? "Pack is moving users, but one or more funnel stages need attention."
            : "Pack is under the current lane benchmarks and needs intervention.",
      partnerSummaryDetail:
        `${Math.round(walletLinkRate * 100)}% wallet linked, ${Math.round(premiumConversionRate * 100)}% premium conversion, and ${Math.round(averageWeeklyXp)} average weekly XP against the ${benchmarkLane} benchmark lane.`,
    };
  });

  const csv = [
    [
      "pack_id",
      "label",
      "lifecycle_state",
      "sources",
      "benchmark_lane",
      "benchmark_status",
      "participant_count",
      "approved_completion_count",
      "wallet_link_rate",
      "premium_conversion_rate",
      "average_weekly_xp",
      "partner_summary_headline",
      "partner_summary_detail",
    ].join(","),
    ...rows.map((row) =>
      [
        row.packId,
        JSON.stringify(row.label),
        row.lifecycleState,
        JSON.stringify(row.sources.join("|")),
        row.benchmarkLane,
        row.benchmarkStatus,
        row.participantCount,
        row.approvedCompletionCount,
        row.walletLinkRate,
        row.premiumConversionRate,
        row.averageWeeklyXp,
        JSON.stringify(row.partnerSummaryHeadline),
        JSON.stringify(row.partnerSummaryDetail),
      ].join(","),
    ),
  ].join("\n");

  const cards = rows.map((row) => `
    <article style="border:1px solid #d8d1c3;border-radius:16px;padding:16px;margin:0 0 16px;background:#fffaf1;">
      <p style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Partner Snapshot</p>
      <h2 style="margin:0 0 8px;font-size:22px;color:#20170a;">${row.label}</h2>
      <p style="margin:0 0 12px;color:#5e5035;">Sources: ${row.sources.join(", ")}. Benchmark lane: ${row.benchmarkLane}. Status: ${row.benchmarkStatus}.</p>
      <p style="margin:0 0 12px;color:#5e5035;"><strong>${row.partnerSummaryHeadline}</strong><br/>${row.partnerSummaryDetail}</p>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;">
        <div><strong>${row.participantCount}</strong><div>Participants</div></div>
        <div><strong>${row.approvedCompletionCount}</strong><div>Approved completions</div></div>
        <div><strong>${Math.round(row.walletLinkRate * 100)}%</strong><div>Wallet link rate</div></div>
        <div><strong>${Math.round(row.premiumConversionRate * 100)}%</strong><div>Premium conversion</div></div>
        <div><strong>${row.averageWeeklyXp.toFixed(0)}</strong><div>Average weekly XP</div></div>
        <div><strong>${row.benchmarkStatus}</strong><div>Benchmark status</div></div>
      </div>
    </article>
  `).join("");

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Emorya Partner Pack Report</title>
      <style>
        body { font-family: Georgia, serif; background:#f5efe2; color:#20170a; margin:32px; }
        h1 { margin:0 0 8px; }
        p { line-height:1.5; }
      </style>
    </head>
    <body>
      <p style="font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#7d6f54;margin:0 0 8px;">Emorya Gamification</p>
      <h1>Partner Campaign Pack Report</h1>
      <p>Generated ${new Date().toISOString()}. Save this page as PDF from the browser print dialog when needed.</p>
      ${cards}
    </body>
  </html>`;

  await fs.mkdir(outputDir, { recursive: true });
  await fs.writeFile(csvPath, csv, "utf8");
  await fs.writeFile(htmlPath, html, "utf8");
  console.log(`Campaign pack report written to ${csvPath}`);
  console.log(`Campaign pack HTML report written to ${htmlPath}`);
} finally {
  await pool.end();
}
