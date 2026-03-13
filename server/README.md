# Server Layer

This directory is reserved for backend code that should not live inside route handlers.

Planned modules:

- `auth/` for credential validation, wallet ownership challenges, and account linking
- `db/` for SQL schema and repository helpers
- `services/` for XP, streaks, achievements, referrals, and quest verification
- referral rewards are issued from server services, not the UI, so invite XP remains idempotent and auditable

Route handlers should stay thin and call into this layer.

Local workflow shortcuts are documented in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/docs/local-development.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/local-development.md), with preview/deployment steps in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/docs/preview-and-deploy.md`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/docs/preview-and-deploy.md) and matching npm commands in [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/package.json`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/package.json).

Migration application is tracked in `schema_migrations` via [`/Users/olivermills/Documents/Emorya Gamify/emorya-gamification/scripts/dev.mjs`](/Users/olivermills/Documents/Emorya%20Gamify/emorya-gamification/scripts/dev.mjs), so the environment can apply only pending SQL files and detect edited historical migrations.
