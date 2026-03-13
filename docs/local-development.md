# Local Development

## Prerequisites

- Node.js and npm installed
- PostgreSQL running locally
- `psql` available in your shell
- `.env.local` created from [`.env.example`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/.env.example)

## One-time setup

From the repo root:

```bash
npm install
npm run dev:setup
```

What `dev:setup` does:

- applies all SQL migrations in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/server/db/migrations`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/server/db/migrations)
- applies the seed data from [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/server/db/seed.sql`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/server/db/seed.sql)

## Daily startup

Use this when your database is already provisioned:

```bash
npm run dev
```

Use this when you want the repo to verify DB state and then start the app:

```bash
npm run dev:boot
```

## Database commands

Check that the database connection works:

```bash
npm run dev:db:doctor
```

Apply only migrations:

```bash
npm run dev:db:migrate
```

Re-apply the seed file without dropping data first:

```bash
npm run dev:db:seed
```

Write explicit leaderboard snapshots:

```bash
npm run dev:db:snapshot:all-time
npm run dev:db:snapshot:referral
npm run dev:db:snapshot:weekly
npm run dev:db:snapshot:monthly
```

Or run a specific period/date manually:

```bash
node scripts/dev.mjs snapshot weekly 2026-03-13
```

Reset the local database completely:

```bash
npm run dev:reset
```

`dev:reset` will:

- drop and recreate the `public` schema
- apply [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/server/db/schema.sql`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/server/db/schema.sql)
- apply all migrations
- apply the seed file

## Verification commands

Run the automated logic test suite:

```bash
npm run test
```

Run linting:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

## Notes

- The helper script reads `DATABASE_URL` from `.env.local` first, then `.env`
- These commands assume your local Postgres instance is reachable from `DATABASE_URL`
- `dev:db:seed` is safe for iterative local reseeding only if the SQL uses idempotent inserts/updates for the rows you care about
- snapshot commands upsert rows into `leaderboard_snapshots` for the chosen period/date
