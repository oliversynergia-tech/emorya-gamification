import { existsSync, readdirSync, readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

import { Client } from "pg";

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

function shouldUseSsl(connectionString) {
  const sslOverride = process.env.DATABASE_SSL;

  if (sslOverride === "true") {
    return true;
  }

  if (sslOverride === "false") {
    return false;
  }

  try {
    const url = new URL(connectionString);
    return !["localhost", "127.0.0.1"].includes(url.hostname);
  } catch {
    return process.env.NODE_ENV === "production";
  }
}

function createClient() {
  const connectionString = ensureDatabaseUrl();
  const useSsl = shouldUseSsl(connectionString);

  return new Client({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
  });
}

async function withClient(work) {
  const client = createClient();

  await client.connect();

  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function runSqlText(client, sql, label) {
  console.log(`\n==> ${label}`);
  await client.query(sql);
}

async function runSqlFile(client, filepath, label) {
  const sql = readFileSync(filepath, "utf8");
  console.log(`\n==> ${label}: ${filepath.replace(`${rootDir}/`, "")}`);
  await client.query(sql);
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

function checksumFor(source) {
  return createHash("sha256").update(source).digest("hex");
}

async function migrationStatus() {
  return withClient(async (client) => {
    await ensureMigrationTable(client);

    const appliedRows = await client.query("SELECT filename, checksum, applied_at FROM schema_migrations ORDER BY filename ASC");
    const applied = new Map(appliedRows.rows.map((row) => [row.filename, row]));
    const migrationFiles = readdirSync(migrationsDir)
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    if (migrationFiles.length === 0) {
      console.log("No migrations found.");
      return;
    }

    for (const filename of migrationFiles) {
      const filepath = resolve(migrationsDir, filename);
      const checksum = checksumFor(readFileSync(filepath, "utf8"));
      const existing = applied.get(filename);

      if (!existing) {
        console.log(`pending  ${filename}`);
        continue;
      }

      const state = existing.checksum === checksum ? "applied " : "drift   ";
      console.log(`${state} ${filename}`);
    }
  });
}

async function migrate() {
  const migrationFiles = readdirSync(migrationsDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  if (migrationFiles.length === 0) {
    console.log("No migrations found.");
    return;
  }

  await withClient(async (client) => {
    await ensureMigrationTable(client);

    const appliedRows = await client.query("SELECT filename, checksum FROM schema_migrations");
    const applied = new Map(appliedRows.rows.map((row) => [row.filename, row.checksum]));

    for (const filename of migrationFiles) {
      const filepath = resolve(migrationsDir, filename);
      const source = readFileSync(filepath, "utf8");
      const checksum = checksumFor(source);
      const existingChecksum = applied.get(filename);

      if (existingChecksum && existingChecksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${filename}. Create a new migration instead of editing an applied file.`);
      }

      if (existingChecksum) {
        console.log(`\n==> Skipping already-applied migration: ${filename}`);
        continue;
      }

      console.log(`\n==> Applying migration: server/db/migrations/${filename}`);

      try {
        await client.query("BEGIN");
        await client.query(source);
        await client.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [filename, checksum],
        );
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    }
  });
}

async function seed() {
  await withClient(async (client) => {
    await runSqlFile(client, resolve(dbDir, "seed.sql"), "Applying seed");
  });
}

async function reset() {
  await withClient(async (client) => {
    await runSqlText(client, "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;", "Resetting local database schema");
    await runSqlFile(client, resolve(dbDir, "schema.sql"), "Applying schema");
  });

  await migrate();
  await seed();
}

async function doctor() {
  await withClient(async (client) => {
    console.log("DATABASE_URL detected.");
    const result = await client.query("SELECT current_database(), current_user");
    const row = result.rows[0];
    console.log(`database: ${row.current_database}`);
    console.log(`user: ${row.current_user}`);
  });
}

async function snapshot(period = "all-time", snapshotDate) {
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

  await withClient(async (client) => {
    console.log(`\n==> Writing ${period} leaderboard snapshot${snapshotDate ? ` for ${snapshotDate}` : ""}`);
    await client.query(query);
  });
}

async function snapshotScheduled(snapshotDate) {
  const periods = ["all-time", "referral", "weekly", "monthly"];

  for (const period of periods) {
    await snapshot(period, snapshotDate);
  }
}

const command = process.argv[2];

try {
  switch (command) {
    case "migrate":
      await migrate();
      break;
    case "migrate-status":
      await migrationStatus();
      break;
    case "seed":
      await seed();
      break;
    case "reset":
      await reset();
      break;
    case "doctor":
      await doctor();
      break;
    case "snapshot":
      await snapshot(process.argv[3], process.argv[4]);
      break;
    case "snapshot-scheduled":
      await snapshotScheduled(process.argv[3]);
      break;
    default:
      console.error("Usage: node scripts/dev.mjs <migrate|migrate-status|seed|reset|doctor|snapshot [period] [YYYY-MM-DD]|snapshot-scheduled [YYYY-MM-DD]>");
      process.exit(1);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(error.stack ?? error.message);
  } else {
    console.error(error);
  }
  process.exit(1);
}
