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
const previewAndDeployDoc = readFileSync(resolve(rootDir, "docs/preview-and-deploy.md"), "utf8");
const releaseProcedureDoc = readFileSync(resolve(rootDir, "docs/release-procedure.md"), "utf8");
const launchHardeningChecklistDoc = readFileSync(resolve(rootDir, "docs/launch-hardening-checklist.md"), "utf8");
const launchStatusDoc = readFileSync(resolve(rootDir, "docs/launch-status.md"), "utf8");
const productionSmokeTestRunbookDoc = readFileSync(resolve(rootDir, "docs/production-smoke-test-runbook.md"), "utf8");
const productionEnvMatrixDoc = readFileSync(resolve(rootDir, "docs/production-env-matrix.md"), "utf8");
const schedulerOwnershipMatrixDoc = readFileSync(resolve(rootDir, "docs/scheduler-ownership-matrix.md"), "utf8");

test("hosted operations docs reference the supported ops scripts", () => {
  const requiredScripts = [
    "ops:db:migrate",
    "ops:db:migrate:status",
    "ops:db:validate:quests",
    "ops:campaign-packs:report",
    "ops:campaign-packs:report:scheduled",
    "ops:db:snapshot:scheduled",
    "ops:env:check",
    "ops:release:state-check",
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

test("hosted operations docs include campaign pack reporting ops guidance", () => {
  assert.match(hostedOperationsDoc, /ops:campaign-packs:report/);
  assert.match(hostedOperationsDoc, /campaign pack reports/i);
  assert.match(hostedOperationsDoc, /ops:campaign-packs:report:scheduled/);
});

test("launch hardening checklist is referenced from deploy docs", () => {
  assert.match(hostedOperationsDoc, /launch-hardening-checklist\.md/);
  assert.match(previewAndDeployDoc, /launch-hardening-checklist\.md/);
  assert.match(releaseProcedureDoc, /launch-hardening-checklist\.md/);
  assert.match(hostedOperationsDoc, /launch-status\.md/);
  assert.match(previewAndDeployDoc, /launch-status\.md/);
  assert.match(releaseProcedureDoc, /launch-status\.md/);
  assert.match(hostedOperationsDoc, /production-smoke-test-runbook\.md/);
  assert.match(previewAndDeployDoc, /production-smoke-test-runbook\.md/);
  assert.match(releaseProcedureDoc, /production-smoke-test-runbook\.md/);
  assert.match(hostedOperationsDoc, /production-env-matrix\.md/);
  assert.match(previewAndDeployDoc, /production-env-matrix\.md/);
  assert.match(releaseProcedureDoc, /production-env-matrix\.md/);
  assert.match(hostedOperationsDoc, /scheduler-ownership-matrix\.md/);
  assert.match(previewAndDeployDoc, /scheduler-ownership-matrix\.md/);
  assert.match(releaseProcedureDoc, /scheduler-ownership-matrix\.md/);
});

test("launch hardening checklist includes current production readiness items", () => {
  for (const text of [
    "APP_URL",
    "CRON_SNAPSHOTS_ENABLED",
    "AUTOMATION_ACTOR_USER_ID",
    "CAMPAIGN_PACK_REPORT_OUTPUT_DIR",
    "ops:release:gate",
  ]) {
    assert.match(launchHardeningChecklistDoc, new RegExp(text.replace(/[:.]/g, "\\$&")));
  }
});

test("launch status doc tracks current hardening blockers and ownership", () => {
  for (const text of [
    "APP_URL",
    "CRON_SNAPSHOTS_ENABLED",
    "AUTOMATION_ACTOR_USER_ID",
    "leaderboard snapshots",
    "campaign-pack reports",
    "payout automation",
  ]) {
    assert.match(launchStatusDoc, new RegExp(text.replace(/[-:.]/g, "\\$&")));
  }
});

test("production smoke test runbook covers core launch paths", () => {
  for (const text of [
    "sign in",
    "wallet-link",
    "quest flow",
    "leaderboard",
    "profile",
    "admin",
  ]) {
    assert.match(productionSmokeTestRunbookDoc.toLowerCase(), new RegExp(text.replace(/[-:.]/g, "\\$&")));
  }
});

test("production env matrix defines scheduler ownership envs", () => {
  for (const text of [
    "LEADERBOARD_SNAPSHOT_OWNER",
    "CAMPAIGN_PACK_REPORT_OWNER",
    "PAYOUT_AUTOMATION_OWNER",
    "CRON_SNAPSHOTS_ENABLED",
    "CAMPAIGN_PACK_REPORT_OUTPUT_DIR",
  ]) {
    assert.match(productionEnvMatrixDoc, new RegExp(text.replace(/[-:.]/g, "\\$&")));
  }
});

test("scheduler ownership matrix covers all scheduled responsibilities", () => {
  for (const text of [
    "leaderboard snapshots",
    "campaign-pack reports",
    "payout automation",
    "hosted",
    "external",
  ]) {
    assert.match(schedulerOwnershipMatrixDoc.toLowerCase(), new RegExp(text.replace(/[-:.]/g, "\\$&")));
  }
});
