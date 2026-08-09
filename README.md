# PerkJoy

PerkJoy is a multi-tenant employee recognition SaaS that keeps birthdays, work anniversaries, and everyday wins from slipping through the cracks. It schedules digital rewards, coordinates Philadelphia local gifts, tracks budgets, and records every important action.

## Stack

- Next.js-compatible App Router via Vinext, React 19, TypeScript, Tailwind CSS
- Supabase Auth + PostgreSQL + Row Level Security for the production data plane
- Cloudflare D1 for the hosted interactive product preview
- Tremendous provider abstraction (sandbox-only by default)
- Stripe Billing webhook foundation
- Lucide icons, Zod, React Hook Form, date-fns

## Local setup

1. Install Node.js 22.13 or later.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local` and fill in only the services you want to exercise.
4. Run `npm run dev` and open the printed local URL.

The preview initializes its local D1 schema on first use and seeds a clearly labeled demo organization. Digital rewards do not contact Tremendous unless its credentials are configured, and `REWARDS_LIVE_MODE=false` blocks production endpoints.

## Supabase setup

1. Create a new Supabase project for PerkJoy. Do not reuse an unrelated database.
2. Apply `supabase/migrations/20260809035207_initial_perkjoy_schema.sql` through the Supabase CLI or dashboard SQL editor.
3. Verify the migration with `supabase migration list` and run database/security advisors.
4. In Data API settings, expose the `public` schema intentionally. The migration explicitly grants authenticated access and enables RLS on every exposed table.
5. Add the project URL and publishable key to `.env.local`. Keep the secret key server-only.
6. Configure Auth redirect URLs for `/reset-password` and your deployment origin.

The migration creates organization membership-based RLS, private authorization helpers, immutable server-managed super-admin state, audit logging, deterministic event keys, reward idempotency constraints, and indexes for common tenant queries. Do not authorize from `user_metadata`.

## Tremendous Sandbox

Set `TREMENDOUS_ENVIRONMENT=sandbox` and `REWARDS_LIVE_MODE=false`, then add the sandbox API key and funding source. `TremendousRewardProvider` is behind the `RewardProvider` interface so another provider can be added without changing recognition logic. The webhook route is idempotent and records provider event IDs before applying updates.

Never enable live mode in development. Production reward sending should require a deployment review, secret rotation, webhook signature verification against the current Tremendous scheme, and an explicit operations approval.

## Stripe test billing

Create Starter, Growth, and Business prices in Stripe test mode, set the three `STRIPE_PRICE_*` variables, and configure `/api/webhooks/stripe` as a webhook endpoint. Subscription status must only be updated from verified Stripe webhook events. SaaS subscription charges and employee reward purchases are deliberately separate.

## Scheduled automation

Run the daily automation from Supabase Cron or an Edge Function. For each active organization, evaluate events in its IANA timezone, match active rules, and insert the deterministic key `organization_id:employee_id:event_type:event_year:rule_id`. The database uniqueness constraints on recognition events and rewards are the final duplicate-send guard.

Recommended order:

1. Create the recognition event in a transaction.
2. Resolve approval mode and budget policy.
3. Create a scheduled or pending-approval reward using the same deterministic idempotency key.
4. Commit before any external provider call.
5. Send through the provider with the idempotency key.
6. Save provider IDs, send notifications, and write an audit entry.

February 29 birthdays default to February 28 in non-leap years and can be configured to March 1 per organization.

## Tests and validation

- `npm run test:logic` runs birthday, leap-day, anniversary, duplicate-key, and budget tests.
- `npm test` runs a production build, business-logic tests, and an HTML smoke test.
- `npm run lint` runs ESLint.
- `npm run db:generate` regenerates the D1 migration after preview schema changes.

Before deployment, also test tenant isolation with two Supabase users in separate organizations, role permissions, webhook replay, Tremendous Sandbox failure handling, and Stripe test-clock subscription transitions.

## Deployment

The included `.openai/hosting.json` declares the D1 preview binding used by Sites. Hosted secrets must be configured in the deployment environment rather than committed. For a standalone production deployment, provision Supabase, apply the migration, add server-only service credentials, configure webhooks and cron, then run `npm run build`.

## Safety notes

- No secret/service key is exposed to browser code.
- Demo vendors are marked as demo data and are not represented as partners.
- Employee addresses are not shown in shared tables.
- Financial actions require a server response before success is displayed.
- The MVP tracks spending limits; it does not implement a stored-value wallet.
