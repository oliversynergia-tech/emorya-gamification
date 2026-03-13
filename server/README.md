# Server Layer

This directory is reserved for backend code that should not live inside route handlers.

Planned modules:

- `auth/` for credential validation, wallet ownership challenges, and account linking
- `db/` for SQL schema and repository helpers
- `services/` for XP, streaks, achievements, referrals, and quest verification
- referral rewards are issued from server services, not the UI, so invite XP remains idempotent and auditable

Route handlers should stay thin and call into this layer.
