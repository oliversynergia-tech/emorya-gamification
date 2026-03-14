# Release Procedure

Use this whenever a hosted environment is being updated.

## Required order

1. Verify the candidate locally:

```bash
npm run test
npm run lint
npm run build
```

2. Push the release commit.

3. In the target environment, run the release gate:

```bash
npm run ops:release:gate
```

4. Confirm the gate passes cleanly:

- env checks pass
- migrations apply successfully
- migration status shows only `applied` rows
- quest validation passes

5. Deploy or promote the application version.

6. If leaderboard history should start immediately, run:

```bash
npm run ops:db:snapshot:scheduled
```

## Do not invert this order

Do not deploy first and plan to run migrations afterwards. This repo now treats schema migration as part of the release gate, not as a cleanup task after the app is live.

## Rollback note

If the release gate fails:

- stop the rollout
- keep traffic on the previous app version
- fix the env, migration, or quest-definition issue in a new commit or release candidate
- rerun `npm run ops:release:gate` before promoting the new build
