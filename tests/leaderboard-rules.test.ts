import test from "node:test";
import assert from "node:assert/strict";

import {
  mapLeaderboardDelta,
  rankLeaderboardEntries,
} from "../server/repositories/leaderboard-rules.ts";

test("rankLeaderboardEntries sorts by xp, then level, then oldest createdAt and shares tied ranks", () => {
  const entries = rankLeaderboardEntries([
    {
      id: "user-3",
      displayName: "Third",
      level: 7,
      xp: 4100,
      badges: 2,
      tier: "free",
      createdAt: "2026-03-12T10:00:00.000Z",
    },
    {
      id: "user-1",
      displayName: "First",
      level: 8,
      xp: 4200,
      badges: 4,
      tier: "annual",
      createdAt: "2026-03-10T10:00:00.000Z",
    },
    {
      id: "user-2",
      displayName: "Second",
      level: 8,
      xp: 4200,
      badges: 1,
      tier: "monthly",
      createdAt: "2026-03-11T10:00:00.000Z",
    },
  ]);

  assert.deepEqual(entries, [
    {
      rank: 1,
      displayName: "First",
      level: 8,
      xp: 4200,
      badges: 4,
      tier: "annual",
      delta: 0,
    },
    {
      rank: 1,
      displayName: "Second",
      level: 8,
      xp: 4200,
      badges: 1,
      tier: "monthly",
      delta: 0,
    },
    {
      rank: 3,
      displayName: "Third",
      level: 7,
      xp: 4100,
      badges: 2,
      tier: "free",
      delta: 0,
    },
  ]);
});

test("mapLeaderboardDelta reports movement against the previous rank", () => {
  assert.equal(mapLeaderboardDelta(2, 5), 3);
  assert.equal(mapLeaderboardDelta(4, 1), -3);
  assert.equal(mapLeaderboardDelta(1, null), 0);
});
