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

3. In the target environment, run:

```bash
npm run ops:db:migrate
npm run ops:db:migrate:status
```

4. Confirm migration status shows only `applied` rows.

5. Deploy or promote the application version.

6. If leaderboard history should start immediately, run:

```bash
npm run ops:db:snapshot:scheduled
```

## Do not invert this order

Do not deploy first and plan to run migrations afterwards. This repo now treats schema migration as part of the release gate, not as a cleanup task after the app is live.

## Rollback note

If a migration or status check fails:

- stop the rollout
- keep traffic on the previous app version
- fix the migration issue in a new commit or release candidate
- rerun the migration commands before promoting the new build
