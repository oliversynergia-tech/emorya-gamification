import assert from "node:assert/strict";
import test from "node:test";

import { getWeeklyProgressBand } from "../lib/progression-rules.ts";

test("getWeeklyProgressBand applies source-driven threshold offsets", () => {
  const defaultBand = getWeeklyProgressBand(120);
  const easierBand = getWeeklyProgressBand(120, -20);

  assert.equal(defaultBand.tierLabel, "Participation");
  assert.equal(defaultBand.nextThreshold, 250);
  assert.equal(easierBand.tierLabel, "Participation");
  assert.equal(easierBand.currentThreshold, 80);
  assert.equal(easierBand.nextThreshold, 230);
  assert.ok(easierBand.progress > defaultBand.progress);
});
