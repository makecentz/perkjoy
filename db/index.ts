import { env } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

export function getDb() {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database."
    );
  }

  return drizzle(env.DB, { schema });
}

const runtimeSchema = [
  `CREATE TABLE IF NOT EXISTS organizations (id text PRIMARY KEY NOT NULL, owner_id text NOT NULL, name text NOT NULL, timezone text DEFAULT 'America/New_York' NOT NULL, monthly_budget_cents integer DEFAULT 50000 NOT NULL, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS organizations_owner_id_unique ON organizations (owner_id)`,
  `CREATE TABLE IF NOT EXISTS employees (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, first_name text NOT NULL, last_name text NOT NULL, email text NOT NULL, department text NOT NULL, job_title text DEFAULT 'Team Member' NOT NULL, birthday_month integer NOT NULL, birthday_day integer NOT NULL, hire_date text NOT NULL, status text DEFAULT 'active' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_employees_org_status ON employees (organization_id,status)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS employees_org_email_unique ON employees (organization_id,email)`,
  `CREATE TABLE IF NOT EXISTS automation_rules (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, name text NOT NULL, event_type text NOT NULL, reward_type text NOT NULL, amount_cents integer DEFAULT 0 NOT NULL, timing text DEFAULT 'On the day' NOT NULL, active integer DEFAULT true NOT NULL, approval_required integer DEFAULT false NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_rules_org_active ON automation_rules (organization_id,active)`,
  `CREATE TABLE IF NOT EXISTS rewards (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE restrict, event_key text NOT NULL, recognition_type text NOT NULL, message text NOT NULL, amount_cents integer NOT NULL, status text NOT NULL, provider text DEFAULT 'tremendous_sandbox' NOT NULL, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS rewards_org_event_key_unique ON rewards (organization_id,event_key)`,
  `CREATE INDEX IF NOT EXISTS idx_rewards_org_created ON rewards (organization_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS reward_provider_events (id text PRIMARY KEY NOT NULL, provider text NOT NULL, provider_event_id text NOT NULL, payload text NOT NULL, processed_at text, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS provider_events_provider_id_unique ON reward_provider_events (provider,provider_event_id)`,
  `CREATE TABLE IF NOT EXISTS vendor_products (id text PRIMARY KEY NOT NULL, vendor_name text NOT NULL, name text NOT NULL, description text NOT NULL, category text NOT NULL, price_cents integer NOT NULL, delivery_fee_cents integer NOT NULL, serves_people integer NOT NULL, demo integer DEFAULT true NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS local_orders (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id), product_id text NOT NULL REFERENCES vendor_products(id), delivery_date text NOT NULL, total_cents integer NOT NULL, status text DEFAULT 'paid' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_local_orders_org_created ON local_orders (organization_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, actor_id text NOT NULL, action text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, metadata text DEFAULT '{}' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs (organization_id,created_at)`,
];

export async function ensureDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch(runtimeSchema.map((statement) => env.DB.prepare(statement)));
}
