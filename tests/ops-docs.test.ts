import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { dbToolUsage, supportedDbCommands } from "../scripts/db-tools.mjs";

const rootDir = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const packageJson = JSON.parse(readFileSync(resolve(rootDir, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
const hostedOperationsDoc = readFileSync(resolve(rootDir, "docs/hosted-operations.md"), "utf8");

test("hosted operations docs reference the supported ops scripts", () => {
  const requiredScripts = [
    "ops:db:migrate",
    "ops:db:migrate:status",
    "ops:db:validate:quests",
    "ops:db:snapshot:scheduled",
    "ops:env:check",
    "ops:release:gate",
  ];

  for (const script of requiredScripts) {
    assert.ok(packageJson.scripts[script], `Missing package script: ${script}`);
    assert.match(hostedOperationsDoc, new RegExp(script.replace(/[:]/g, "\\:")));
  }
});

test("db tool usage string stays aligned with the supported command list", () => {
  for (const command of supportedDbCommands) {
    assert.match(dbToolUsage, new RegExp(command.replace(/[-]/g, "\\-")));
  }
});

test("hosted operations docs include the dated snapshot example", () => {
  assert.match(
    hostedOperationsDoc,
    /node scripts\/ops\.mjs snapshot-scheduled 2026-03-14/,
  );
});

test("hosted operations docs include moderation alert envs", () => {
  for (const key of [
    "MODERATION_ALERT_STALE_MINUTES",
    "MODERATION_ALERT_EMAIL_TO",
    "MODERATION_ALERT_SLACK_WEBHOOK_URL",
  ]) {
    assert.match(hostedOperationsDoc, new RegExp(key));
  }
});
