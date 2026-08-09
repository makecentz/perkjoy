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
  `CREATE TABLE IF NOT EXISTS vendor_products (id text PRIMARY KEY NOT NULL, vendor_name text NOT NULL, name text NOT NULL, description text NOT NULL, category text NOT NULL, price_cents integer NOT NULL, delivery_fee_cents integer NOT NULL, serves_people integer NOT NULL, demo integer DEFAULT true NOT NULL, vendor_cost_cents integer DEFAULT 0 NOT NULL, delivery_cost_cents integer DEFAULT 0 NOT NULL, platform_fee_cents integer DEFAULT 0 NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subscriptions (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, plan text NOT NULL, status text DEFAULT 'trial' NOT NULL, monthly_recurring_revenue_cents integer DEFAULT 0 NOT NULL, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_organization_unique ON subscriptions (organization_id)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status)`,
  `CREATE TABLE IF NOT EXISTS local_orders (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id), product_id text NOT NULL REFERENCES vendor_products(id), delivery_date text NOT NULL, total_cents integer NOT NULL, status text DEFAULT 'paid' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_local_orders_org_created ON local_orders (organization_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS audit_logs (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, actor_id text NOT NULL, action text NOT NULL, entity_type text NOT NULL, entity_id text NOT NULL, metadata text DEFAULT '{}' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_org_created ON audit_logs (organization_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS celebration_types (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, name text NOT NULL, slug text NOT NULL, category text NOT NULL, active integer DEFAULT true NOT NULL, manual_only integer DEFAULT false NOT NULL, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS celebration_types_org_slug_unique ON celebration_types (organization_id,slug)`,
  `CREATE INDEX IF NOT EXISTS idx_celebration_types_org_active ON celebration_types (organization_id,active)`,
  `CREATE TABLE IF NOT EXISTS employee_events (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, celebration_type_id text REFERENCES celebration_types(id) ON DELETE set null, title text NOT NULL, event_date text NOT NULL, category text NOT NULL, status text DEFAULT 'needs_attention' NOT NULL, reward_summary text DEFAULT 'No celebration configured' NOT NULL, handled_steps text DEFAULT '[]' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_employee_events_org_date ON employee_events (organization_id,event_date)`,
  `CREATE INDEX IF NOT EXISTS idx_employee_events_org_status ON employee_events (organization_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_employee_events_employee ON employee_events (employee_id)`,
  `CREATE TABLE IF NOT EXISTS celebration_profiles (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, invite_token text NOT NULL, invite_expires_at text NOT NULL, completeness integer DEFAULT 0 NOT NULL, privacy_mode text DEFAULT 'recommendations_only' NOT NULL, work_mode text DEFAULT 'office' NOT NULL, preferred_delivery text DEFAULT 'workplace' NOT NULL, updated_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS celebration_profiles_employee_unique ON celebration_profiles (employee_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS celebration_profiles_invite_token_unique ON celebration_profiles (invite_token)`,
  `CREATE INDEX IF NOT EXISTS idx_celebration_profiles_org ON celebration_profiles (organization_id)`,
  `CREATE TABLE IF NOT EXISTS celebration_preferences (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, food text DEFAULT '{}' NOT NULL, rewards text DEFAULT '{}' NOT NULL, interests text DEFAULT '[]' NOT NULL, shirt_size text, dietary text DEFAULT '[]' NOT NULL, share_with_hr integer DEFAULT false NOT NULL, created_at text NOT NULL, updated_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS celebration_preferences_employee_unique ON celebration_preferences (employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_celebration_preferences_org ON celebration_preferences (organization_id)`,
  `CREATE TABLE IF NOT EXISTS markets (id text PRIMARY KEY NOT NULL, name text NOT NULL, slug text NOT NULL, city text NOT NULL, state text NOT NULL, country text DEFAULT 'US' NOT NULL, active integer DEFAULT false NOT NULL, launch_status text DEFAULT 'coming_soon' NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS markets_slug_unique ON markets (slug)`,
  `CREATE TABLE IF NOT EXISTS organization_locations (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, market_id text REFERENCES markets(id) ON DELETE set null, name text NOT NULL, location_type text DEFAULT 'office' NOT NULL, address text, active integer DEFAULT true NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_locations_org_active ON organization_locations (organization_id,active)`,
  `CREATE TABLE IF NOT EXISTS employee_locations (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, organization_location_id text NOT NULL REFERENCES organization_locations(id) ON DELETE cascade, created_at text NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS employee_locations_employee_unique ON employee_locations (employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_employee_locations_location ON employee_locations (organization_location_id)`,
  `CREATE TABLE IF NOT EXISTS bundles (id text PRIMARY KEY NOT NULL, market_id text NOT NULL REFERENCES markets(id) ON DELETE cascade, vendor_name text NOT NULL, name text NOT NULL, description text NOT NULL, category text NOT NULL, customer_price_cents integer NOT NULL, active integer DEFAULT true NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_bundles_market_active ON bundles (market_id,active)`,
  `CREATE TABLE IF NOT EXISTS bundle_items (id text PRIMARY KEY NOT NULL, bundle_id text NOT NULL REFERENCES bundles(id) ON DELETE cascade, product_id text REFERENCES vendor_products(id) ON DELETE set null, name text NOT NULL, quantity integer DEFAULT 1 NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON bundle_items (bundle_id)`,
  `CREATE TABLE IF NOT EXISTS recommendations (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, employee_event_id text REFERENCES employee_events(id) ON DELETE set null, reward_type text NOT NULL, title text NOT NULL, amount_cents integer DEFAULT 0 NOT NULL, recommendation_score integer NOT NULL, recommendation_reason text NOT NULL, something_different integer DEFAULT false NOT NULL, status text DEFAULT 'recommended' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_recommendations_org_status ON recommendations (organization_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_recommendations_employee ON recommendations (employee_id)`,
  `CREATE TABLE IF NOT EXISTS gift_history (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade, recommendation_id text REFERENCES recommendations(id) ON DELETE set null, title text NOT NULL, reward_type text NOT NULL, occasion text NOT NULL, amount_cents integer DEFAULT 0 NOT NULL, status text DEFAULT 'scheduled' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_gift_history_employee_created ON gift_history (employee_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_gift_history_org_created ON gift_history (organization_id,created_at)`,
  `CREATE TABLE IF NOT EXISTS approval_requests (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, entity_type text NOT NULL, entity_id text NOT NULL, approval_level text NOT NULL, amount_cents integer DEFAULT 0 NOT NULL, status text DEFAULT 'pending' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_approvals_org_status ON approval_requests (organization_id,status)`,
  `CREATE TABLE IF NOT EXISTS approval_policies (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, name text NOT NULL, reward_type text NOT NULL, minimum_cents integer DEFAULT 0 NOT NULL, maximum_cents integer, approval_level text NOT NULL, active integer DEFAULT true NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_approval_policies_org_active ON approval_policies (organization_id,active)`,
  `CREATE TABLE IF NOT EXISTS concierge_requests (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE restrict, occasion text NOT NULL, budget_cents integer NOT NULL, delivery_date text NOT NULL, status text DEFAULT 'submitted' NOT NULL, recommendation text, service_fee_cents integer DEFAULT 0 NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_concierge_org_status ON concierge_requests (organization_id,status)`,
  `CREATE TABLE IF NOT EXISTS team_celebrations (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, title text NOT NULL, event_type text NOT NULL, event_date text NOT NULL, department text, reward_mode text NOT NULL, budget_cents integer DEFAULT 0 NOT NULL, status text DEFAULT 'planned' NOT NULL, created_at text NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_team_celebrations_org_date ON team_celebrations (organization_id,event_date)`,
  `CREATE TABLE IF NOT EXISTS team_celebration_participants (id text PRIMARY KEY NOT NULL, organization_id text NOT NULL REFERENCES organizations(id) ON DELETE cascade, team_celebration_id text NOT NULL REFERENCES team_celebrations(id) ON DELETE cascade, employee_id text NOT NULL REFERENCES employees(id) ON DELETE cascade)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS team_celebration_participant_unique ON team_celebration_participants (team_celebration_id,employee_id)`,
  `CREATE INDEX IF NOT EXISTS idx_team_participants_employee ON team_celebration_participants (employee_id)`,
  `CREATE TABLE IF NOT EXISTS vendor_availability (id text PRIMARY KEY NOT NULL, market_id text NOT NULL REFERENCES markets(id) ON DELETE cascade, vendor_name text NOT NULL, minimum_notice_hours integer DEFAULT 48 NOT NULL, available_days text DEFAULT '[]' NOT NULL, blackout_dates text DEFAULT '[]' NOT NULL, delivery_hours text DEFAULT '{}' NOT NULL, fulfillment_method text DEFAULT 'vendor_delivery' NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_vendor_availability_market ON vendor_availability (market_id)`,
  `CREATE TABLE IF NOT EXISTS marketplace_listings (id text PRIMARY KEY NOT NULL, product_id text NOT NULL REFERENCES vendor_products(id) ON DELETE cascade, market_id text NOT NULL REFERENCES markets(id) ON DELETE cascade, vendor_availability_id text NOT NULL REFERENCES vendor_availability(id) ON DELETE cascade, rating_tenths integer DEFAULT 49 NOT NULL, preference_tags text DEFAULT '[]' NOT NULL, active integer DEFAULT true NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS marketplace_listings_product_market_unique ON marketplace_listings (product_id,market_id)`,
  `CREATE INDEX IF NOT EXISTS idx_marketplace_listings_market_active ON marketplace_listings (market_id,active)`,
];

export async function ensureDb() {
  if (!env.DB) throw new Error("Cloudflare D1 binding `DB` is unavailable.");
  await env.DB.batch(runtimeSchema.map((statement) => env.DB.prepare(statement)));
  const requiredColumns = [
    ["vendor_products", "vendor_cost_cents", "vendor_cost_cents integer DEFAULT 0 NOT NULL"],
    ["vendor_products", "delivery_cost_cents", "delivery_cost_cents integer DEFAULT 0 NOT NULL"],
    ["vendor_products", "platform_fee_cents", "platform_fee_cents integer DEFAULT 0 NOT NULL"],
    ["concierge_requests", "service_fee_cents", "service_fee_cents integer DEFAULT 0 NOT NULL"],
  ] as const;
  for (const [table, column, definition] of requiredColumns) {
    const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all<{ name: string }>();
    if (!info.results.some((item) => item.name === column)) await env.DB.prepare(`ALTER TABLE ${table} ADD COLUMN ${definition}`).run();
  }
  await env.DB.prepare("PRAGMA optimize").run();
}
