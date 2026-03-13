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

if ((process.env.APP_URL ?? "").startsWith("http://")) {
  warnings.push("APP_URL should use https:// for production.");
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

if (process.env.CRON_SNAPSHOTS_ENABLED !== "true") {
  warnings.push("CRON_SNAPSHOTS_ENABLED is not true.");
}

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.join(", ")}`);
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
