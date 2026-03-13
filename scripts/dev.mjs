import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const dbDir = resolve(rootDir, "server/db");
const migrationsDir = resolve(dbDir, "migrations");

function loadEnvFile(filename) {
  const filepath = resolve(rootDir, filename);

  if (!existsSync(filepath)) {
    return;
  }

  const source = readFileSync(filepath, "utf8");

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function ensureDatabaseUrl() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error("DATABASE_URL is not configured. Add it to .env.local or export it in your shell.");
    process.exit(1);
  }

  return databaseUrl;
}

function runPsql(args, label) {
  const databaseUrl = ensureDatabaseUrl();
  const result = spawnSync("psql", [databaseUrl, ...args], {
    cwd: rootDir,
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    console.error(`${label} failed:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runSqlFile(filepath, label) {
  console.log(`\n==> ${label}: ${filepath.replace(`${rootDir}/`, "")}`);
  runPsql(["-f", filepath], label);
}

function migrate() {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    console.log("No migrations found.");
    return;
  }

  for (const filename of migrationFiles) {
    runSqlFile(resolve(migrationsDir, filename), "Applying migration");
  }
}

function seed() {
  runSqlFile(resolve(dbDir, "seed.sql"), "Applying seed");
}

function reset() {
  console.log("\n==> Resetting local database schema");
  runPsql(
    ["-c", "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;"],
    "Resetting database",
  );
  runSqlFile(resolve(dbDir, "schema.sql"), "Applying schema");
  migrate();
  seed();
}

function doctor() {
  ensureDatabaseUrl();
  console.log("DATABASE_URL detected.");
  runPsql(["-c", "SELECT current_database(), current_user;"], "Running database check");
}

function snapshot(period = "all-time", snapshotDate) {
  const supportedPeriods = new Set(["all-time", "referral", "weekly", "monthly"]);

  if (!supportedPeriods.has(period)) {
    console.error(`Unsupported snapshot period: ${period}`);
    process.exit(1);
  }

  const dateClause = snapshotDate ? `'${snapshotDate}'::date` : "CURRENT_DATE";
  const xpExpression =
    period === "referral"
      ? "COALESCE(SUM(r.signup_reward_xp + r.conversion_reward_xp), 0)::int"
      : "u.total_xp";
  const rankOrder =
    period === "referral"
      ? `${xpExpression} DESC, COUNT(*) FILTER (WHERE r.referee_subscribed = TRUE) DESC, u.created_at ASC`
      : "u.total_xp DESC, u.level DESC, u.created_at ASC";

  const query = `
WITH snapshot_source AS (
  SELECT u.id AS user_id,
         ${xpExpression} AS xp,
         RANK() OVER (ORDER BY ${rankOrder}) AS rank
  FROM users u
  LEFT JOIN referrals r ON r.referrer_user_id = u.id
  GROUP BY u.id, u.total_xp, u.level, u.created_at
)
INSERT INTO leaderboard_snapshots (id, user_id, period, xp, rank, snapshot_date)
SELECT (
         substr(md5(user_id::text || '${period}' || ${dateClause}::text), 1, 8) || '-' ||
         substr(md5(user_id::text || '${period}' || ${dateClause}::text), 9, 4) || '-' ||
         substr(md5(user_id::text || '${period}' || ${dateClause}::text), 13, 4) || '-' ||
         substr(md5(user_id::text || '${period}' || ${dateClause}::text), 17, 4) || '-' ||
         substr(md5(user_id::text || '${period}' || ${dateClause}::text), 21, 12)
       )::uuid,
       user_id,
       '${period}',
       xp,
       rank,
       ${dateClause}
FROM snapshot_source
ON CONFLICT (user_id, period, snapshot_date)
DO UPDATE SET xp = EXCLUDED.xp, rank = EXCLUDED.rank;
`;

  console.log(`\n==> Writing ${period} leaderboard snapshot${snapshotDate ? ` for ${snapshotDate}` : ""}`);
  runPsql(["-c", query], "Writing leaderboard snapshot");
}

const command = process.argv[2];

switch (command) {
  case "migrate":
    migrate();
    break;
  case "seed":
    seed();
    break;
  case "reset":
    reset();
    break;
  case "doctor":
    doctor();
    break;
  case "snapshot":
    snapshot(process.argv[3], process.argv[4]);
    break;
  default:
    console.error("Usage: node scripts/dev.mjs <migrate|seed|reset|doctor|snapshot [period] [YYYY-MM-DD]>");
    process.exit(1);
}
