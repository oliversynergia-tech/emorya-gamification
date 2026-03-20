import path from "node:path";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";

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

await loadEnvFile(path.resolve(process.cwd(), ".env.local"));
await loadEnvFile(path.resolve(process.cwd(), ".env"));

if (process.env.CAMPAIGN_PACK_REPORTS_ENABLED === "false") {
  console.log("Campaign pack scheduled reports are disabled by configuration.");
  process.exit(0);
}

const outputDir = process.env.CAMPAIGN_PACK_REPORT_OUTPUT_DIR?.trim() || "reports/campaign-packs";
const scriptPath = path.resolve(process.cwd(), "scripts/export-campaign-pack-report.mjs");

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [scriptPath, "--output-dir", outputDir], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    if (code === 0) {
      resolve(undefined);
      return;
    }

    reject(new Error(`Scheduled campaign pack report failed with exit code ${code ?? "unknown"}.`));
  });

  child.on("error", reject);
});
