# Production Smoke Test Runbook

Use this after the release gate passes and before calling the rollout complete.

## 1. Access And Session

1. Open the deployed app root.
2. Confirm the homepage loads.
3. Open `/auth`.
4. Confirm sign-in and sign-up surfaces render correctly.

## 2. Auth Flow

1. Sign in with a valid account.
2. Confirm redirect lands in a real app surface, not an error state.
3. Confirm dashboard loads without missing critical data.

## 3. Mission Routing

1. Confirm the dashboard mission module renders.
2. Click the primary mission CTA.
3. Confirm the route lands on the expected mission or quest surface.
4. Return to profile and confirm mission recap still reflects the same mission state.

## 4. Wallet Linking

1. Open profile or auth wallet-link flow.
2. Confirm wallet-link UI renders.
3. If wallet-connect is enabled for launch, confirm the xPortal path can start.
4. Confirm wallet-linked users no longer see the wallet blocker as the top mission gate.

## 5. Quest Flow

1. Open the quest board.
2. Submit one valid quest path if safe in the target environment.
3. Confirm success feedback renders.
4. Confirm mission progress updates without a broken state.

## 6. Leaderboard And Profile

1. Open `/leaderboard`.
2. Confirm leaderboard data loads.
3. Open `/profile`.
4. Confirm profile mission recap, payout view, and account-edit surfaces load.

## 7. Admin

1. Open `/admin` with an admin-capable account.
2. Confirm campaign operations, payout operations, and review/admin sections render.
3. Confirm pack analytics, pack alerts, and payout ops panels load without missing critical data.

## 8. Reporting And Ops

1. Run or verify the latest partner report export path if it is part of launch.
2. Confirm report output is written to the expected storage path.
3. Confirm alert routing configuration exists where required.

## 9. Final Check

Mark the smoke test as passed only if:

- auth works
- mission routing works
- quest flow works
- profile and leaderboard work
- admin loads
- no critical blocking data/state is missing

If any of those fail:

- stop launch completion
- keep traffic on the prior stable state if needed
- fix the issue
- rerun the smoke test before calling the rollout complete
