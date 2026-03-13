# Emorya Architecture

## Locked choices

This project will use a single Next.js application for both the product UI and backend API surface.

- Runtime: Next.js App Router with Route Handlers
- Deployment target: Vercel-first, with Railway-compatible PostgreSQL hosting
- Primary database: PostgreSQL
- Auth model: custom account system with email/password plus MultiversX wallet linking into one user record
- Session model: signed HTTP-only cookie sessions issued by the server
- Verification model: server-side verification adapters by quest type

## Why these choices

### Next.js as the full stack

The brief already targets React or Next.js with a TypeScript backend. Keeping UI, server routes, and admin tools in one codebase reduces duplication and gives a straightforward deployment path.

Route Handlers are the backend boundary for:

- auth
- profile updates
- quest submissions
- leaderboard reads
- admin actions
- scheduled jobs

### PostgreSQL as the source of truth

The platform needs relational joins, recurring jobs, progression snapshots, moderation state, and auditability. PostgreSQL is the right default for:

- users and linked identities
- quests and completions
- achievements
- referrals
- leaderboard snapshots
- UGC moderation
- activity log

### Custom auth instead of wallet-only auth

The brief explicitly requires dual authentication with linked identities. That means the backend must support:

- an email/password credential on the user account
- one or more linked wallet addresses
- a linking flow from either side
- server-side session ownership checks

This is easier to model cleanly with a custom user and identity schema than with a wallet-only campaign system.

## Service boundaries

### App layer

- App Router pages for onboarding, dashboard, profile, leaderboard, and admin
- Server Components for initial data fetches
- Client Components only where interaction or animation is needed

### API layer

- `app/api/auth/*` for sign-up, sign-in, sign-out, session, and account linking
- `app/api/quests/*` for quest listing, submissions, and review actions
- `app/api/profile/*` for profile edits and social connection state
- `app/api/leaderboard/*` for all-time, weekly, monthly, and referral boards
- `app/api/admin/*` for admin-only moderation and analytics
- `app/api/cron/*` for snapshotting, streak evaluation, and scheduled events

### Data layer

- SQL schema owned inside this repo
- thin repository functions in `server/`
- business logic separated from route handlers

## Initial folder contract

```text
/app
  /api
  /admin
  /dashboard
  /leaderboard
  /profile
/components
/docs
/lib
  config.ts
  types.ts
/server
  auth/
  db/
  services/
```

## Environment contract

Required immediately:

- `APP_URL`
- `DATABASE_URL`
- `SESSION_SECRET`
- `NEXT_PUBLIC_MULTIVERSX_CHAIN`

Needed before auth and integrations land:

- `NEXT_PUBLIC_MULTIVERSX_WALLETCONNECT_PROJECT_ID`
- `MULTIVERSX_API_URL`
- `ADMIN_EMAIL_ALLOWLIST`
- `TWITTER_API_BEARER_TOKEN`
- `TELEGRAM_BOT_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`

## What this means for the next step

Step 3 should build the real domain model and data access layer around this shape:

- create SQL schema files for users, identities, quests, completions, achievements, referrals, snapshots, UGC, and activity log
- add server repositories and service functions
- replace current mock data imports with server-side reads

Step 3 status:

- `server/db/schema.sql` defines the first core schema
- `server/db/seed.sql` provides local sample data for the current UI shape
- `server/repositories/platform-repository-db.ts` reads dashboard and admin views from PostgreSQL
- `app/api/dashboard/route.ts` now reports PostgreSQL-backed dashboard data directly and returns explicit errors instead of silently swapping to mock data

Wallet-link status:

- `app/api/auth/wallet/challenge` issues signed-message challenges for the authenticated user
- `app/api/auth/wallet/complete` attaches a MultiversX identity to the current account
- challenge persistence is real and stored in PostgreSQL
- cryptographic verification now uses the official MultiversX SDK on the server
- browser-side wallet-provider integration is still pending, so the current UI expects the user to paste a signature

Admin authorization status:

- admin review routes are protected by an explicit email allowlist in `ADMIN_EMAIL_ALLOWLIST`
- only allowlisted signed-in accounts can access `/admin`, load the review queue, or approve/reject submissions
- this is the temporary authorization layer until a first-class role model is added to the database

Referral system status:

- sign-up accepts an optional referral code and persists both `users.referred_by` and a `referrals` row
- referral rewards are tracked in PostgreSQL with separate signup and conversion XP fields
- referrers earn 40 XP when an invited user joins and 120 XP when that invited user upgrades above the free tier
- dashboard and profile surfaces now read referral progress from the database instead of showing only a static code

Manual review status:

- manual-review submissions now capture `platform`, `contentUrl`, `screenshotUrl`, and submitter notes in `quest_completions.submission_data`
- admin review actions can attach a `moderationNote` and moderation timestamp to the same submission record
- this keeps richer moderation context without forcing a separate submission table yet

Leaderboard status:

- the current all-time leaderboard is now derived from live `users.total_xp` instead of seeded `leaderboard_snapshots` rows
- daily snapshots remain in PostgreSQL for historical comparison and movement deltas
- the app now upserts fresh `all-time` and `referral` snapshots for the current date so rank changes can be compared against prior snapshot days

Developer workflow status:

- repeatable local commands now exist for migration, reseeding, DB health checks, and full reset
- the repo-level entry points are `npm run dev:setup`, `npm run dev:reset`, `npm run dev:db:migrate`, `npm run dev:db:seed`, and `npm run dev:boot`
- the implementation lives in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/scripts/dev.mjs`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/scripts/dev.mjs)

## Reference points

- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- Supabase auth docs for email/password patterns: https://supabase.com/docs/guides/auth/passwords
- MultiversX wallet and dapp docs: https://docs.multiversx.com/wallet/introduction/
