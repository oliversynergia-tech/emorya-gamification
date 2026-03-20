import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));

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

loadEnvFile(".env.local");
loadEnvFile(".env");

const requiredKeys = [
  "APP_URL",
  "DATABASE_URL",
  "SESSION_SECRET",
  "NEXT_PUBLIC_MULTIVERSX_CHAIN",
];

const missing = requiredKeys.filter((key) => !process.env[key]);
const warnings = [];
const errors = [];
const isProduction = (process.env.NODE_ENV ?? "").toLowerCase() === "production";

const schedulerOwners = {
  leaderboard: process.env.LEADERBOARD_SNAPSHOT_OWNER ?? "",
  campaignReports: process.env.CAMPAIGN_PACK_REPORT_OWNER ?? "",
  payoutAutomation: process.env.PAYOUT_AUTOMATION_OWNER ?? "",
};

const allowedSchedulerOwners = {
  leaderboard: ["hosted", "external", "manual"],
  campaignReports: ["hosted", "external", "disabled"],
  payoutAutomation: ["hosted", "external", "manual"],
};

function isOneOf(value, allowed) {
  return allowed.includes(value);
}

if ((process.env.APP_URL ?? "").startsWith("http://")) {
  if (isProduction) {
    errors.push("APP_URL must use https:// in production.");
  } else {
    warnings.push("APP_URL should use https:// for production.");
  }
}

if ((process.env.SESSION_SECRET ?? "").length < 32) {
  warnings.push("SESSION_SECRET should be at least 32 characters.");
}

if (!process.env.NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID) {
  warnings.push("NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID is missing.");
}

if (!process.env.MULTIVERSX_API_URL?.startsWith("https://")) {
  warnings.push("MULTIVERSX_API_URL should use https://.");
}

if (
  process.env.CRON_SNAPSHOTS_ENABLED !== "true" &&
  (!schedulerOwners.leaderboard || schedulerOwners.leaderboard === "hosted")
) {
  warnings.push("CRON_SNAPSHOTS_ENABLED is not true.");
}

if (isProduction) {
  if (!isOneOf(schedulerOwners.leaderboard, allowedSchedulerOwners.leaderboard)) {
    errors.push("LEADERBOARD_SNAPSHOT_OWNER must be hosted, external, or manual in production.");
  }

  if (!isOneOf(schedulerOwners.campaignReports, allowedSchedulerOwners.campaignReports)) {
    errors.push("CAMPAIGN_PACK_REPORT_OWNER must be hosted, external, or disabled in production.");
  }

  if (!isOneOf(schedulerOwners.payoutAutomation, allowedSchedulerOwners.payoutAutomation)) {
    errors.push("PAYOUT_AUTOMATION_OWNER must be hosted, external, or manual in production.");
  }

  if (schedulerOwners.leaderboard === "hosted" && process.env.CRON_SNAPSHOTS_ENABLED !== "true") {
    errors.push("CRON_SNAPSHOTS_ENABLED must be true when LEADERBOARD_SNAPSHOT_OWNER is hosted.");
  }

  if (schedulerOwners.campaignReports === "hosted" && process.env.CAMPAIGN_PACK_REPORTS_ENABLED !== "true") {
    errors.push("CAMPAIGN_PACK_REPORTS_ENABLED must be true when CAMPAIGN_PACK_REPORT_OWNER is hosted.");
  }

  if (schedulerOwners.campaignReports === "hosted" && !process.env.CAMPAIGN_PACK_REPORT_OUTPUT_DIR) {
    errors.push("CAMPAIGN_PACK_REPORT_OUTPUT_DIR is required when CAMPAIGN_PACK_REPORT_OWNER is hosted.");
  }

  if (schedulerOwners.payoutAutomation === "hosted" && !process.env.AUTOMATION_ACTOR_USER_ID) {
    errors.push("AUTOMATION_ACTOR_USER_ID is required when PAYOUT_AUTOMATION_OWNER is hosted.");
  }

  if (
    schedulerOwners.payoutAutomation === "hosted" &&
    (!process.env.PAYOUT_AUTOMATION_MAX_RETRIES || Number.isNaN(Number(process.env.PAYOUT_AUTOMATION_MAX_RETRIES)))
  ) {
    errors.push("PAYOUT_AUTOMATION_MAX_RETRIES must be set to a number when PAYOUT_AUTOMATION_OWNER is hosted.");
  }
} else {
  if (schedulerOwners.leaderboard && !isOneOf(schedulerOwners.leaderboard, allowedSchedulerOwners.leaderboard)) {
    warnings.push("LEADERBOARD_SNAPSHOT_OWNER should be hosted, external, or manual.");
  }

  if (
    schedulerOwners.campaignReports &&
    !isOneOf(schedulerOwners.campaignReports, allowedSchedulerOwners.campaignReports)
  ) {
    warnings.push("CAMPAIGN_PACK_REPORT_OWNER should be hosted, external, or disabled.");
  }

  if (
    schedulerOwners.payoutAutomation &&
    !isOneOf(schedulerOwners.payoutAutomation, allowedSchedulerOwners.payoutAutomation)
  ) {
    warnings.push("PAYOUT_AUTOMATION_OWNER should be hosted, external, or manual.");
  }
}

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.join(", ")}`);
  process.exit(1);
}

if (errors.length > 0) {
  console.error("Deployment errors:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

if (warnings.length > 0) {
  console.warn("Deployment warnings:");
  for (const warning of warnings) {
    console.warn(`- ${warning}`);
  }
} else {
  console.log("Environment validation passed with no deployment warnings.");
}
