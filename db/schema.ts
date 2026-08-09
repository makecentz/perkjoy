import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const organizations = sqliteTable("organizations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  monthlyBudgetCents: integer("monthly_budget_cents").notNull().default(50000),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("organizations_owner_id_unique").on(table.ownerId)]);

export const employees = sqliteTable("employees", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email").notNull(),
  department: text("department").notNull(),
  jobTitle: text("job_title").notNull().default("Team Member"),
  birthdayMonth: integer("birthday_month").notNull(),
  birthdayDay: integer("birthday_day").notNull(),
  hireDate: text("hire_date").notNull(),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_employees_org_status").on(table.organizationId, table.status),
  uniqueIndex("employees_org_email_unique").on(table.organizationId, table.email),
]);

export const automationRules = sqliteTable("automation_rules", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(),
  rewardType: text("reward_type").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  timing: text("timing").notNull().default("On the day"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  approvalRequired: integer("approval_required", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_rules_org_active").on(table.organizationId, table.active)]);

export const rewards = sqliteTable("rewards", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "restrict" }),
  eventKey: text("event_key").notNull(),
  recognitionType: text("recognition_type").notNull(),
  message: text("message").notNull(),
  amountCents: integer("amount_cents").notNull(),
  status: text("status").notNull(),
  provider: text("provider").notNull().default("tremendous_sandbox"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("rewards_org_event_key_unique").on(table.organizationId, table.eventKey),
  index("idx_rewards_org_created").on(table.organizationId, table.createdAt),
]);

export const rewardProviderEvents = sqliteTable("reward_provider_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerEventId: text("provider_event_id").notNull(),
  payload: text("payload").notNull(),
  processedAt: text("processed_at"),
  createdAt: text("created_at").notNull(),
}, (table) => [uniqueIndex("provider_events_provider_id_unique").on(table.provider, table.providerEventId)]);

export const vendorProducts = sqliteTable("vendor_products", {
  id: text("id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priceCents: integer("price_cents").notNull(),
  deliveryFeeCents: integer("delivery_fee_cents").notNull(),
  servesPeople: integer("serves_people").notNull(),
  demo: integer("demo", { mode: "boolean" }).notNull().default(true),
});

export const localOrders = sqliteTable("local_orders", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id),
  productId: text("product_id").notNull().references(() => vendorProducts.id),
  deliveryDate: text("delivery_date").notNull(),
  totalCents: integer("total_cents").notNull(),
  status: text("status").notNull().default("paid"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_local_orders_org_created").on(table.organizationId, table.createdAt)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actorId: text("actor_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_audit_org_created").on(table.organizationId, table.createdAt)]);

export const celebrationTypes = sqliteTable("celebration_types", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category", { enum: ["career", "life"] }).notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  manualOnly: integer("manual_only", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
}, (table) => [
  uniqueIndex("celebration_types_org_slug_unique").on(table.organizationId, table.slug),
  index("idx_celebration_types_org_active").on(table.organizationId, table.active),
]);

export const employeeEvents = sqliteTable("employee_events", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  celebrationTypeId: text("celebration_type_id").references(() => celebrationTypes.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  eventDate: text("event_date").notNull(),
  category: text("category", { enum: ["career", "life"] }).notNull(),
  status: text("status", { enum: ["needs_attention", "scheduled", "approval_required", "handled", "delivered", "skipped"] }).notNull().default("needs_attention"),
  rewardSummary: text("reward_summary").notNull().default("No celebration configured"),
  handledSteps: text("handled_steps").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_employee_events_org_date").on(table.organizationId, table.eventDate),
  index("idx_employee_events_org_status").on(table.organizationId, table.status),
  index("idx_employee_events_employee").on(table.employeeId),
]);

export const celebrationProfiles = sqliteTable("celebration_profiles", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  inviteTokenHash: text("invite_token").notNull(),
  inviteExpiresAt: text("invite_expires_at").notNull(),
  completeness: integer("completeness").notNull().default(0),
  privacyMode: text("privacy_mode", { enum: ["share_with_hr", "recommendations_only"] }).notNull().default("recommendations_only"),
  workMode: text("work_mode", { enum: ["office", "remote", "hybrid"] }).notNull().default("office"),
  preferredDelivery: text("preferred_delivery", { enum: ["workplace", "home", "digital_only"] }).notNull().default("workplace"),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("celebration_profiles_employee_unique").on(table.employeeId),
  uniqueIndex("celebration_profiles_invite_token_unique").on(table.inviteTokenHash),
  index("idx_celebration_profiles_org").on(table.organizationId),
]);

export const celebrationPreferences = sqliteTable("celebration_preferences", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  food: text("food").notNull().default("{}"),
  rewards: text("rewards").notNull().default("{}"),
  interests: text("interests").notNull().default("[]"),
  shirtSize: text("shirt_size"),
  dietary: text("dietary").notNull().default("[]"),
  shareWithHr: integer("share_with_hr", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  uniqueIndex("celebration_preferences_employee_unique").on(table.employeeId),
  index("idx_celebration_preferences_org").on(table.organizationId),
]);

export const markets = sqliteTable("markets", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  country: text("country").notNull().default("US"),
  active: integer("active", { mode: "boolean" }).notNull().default(false),
  launchStatus: text("launch_status", { enum: ["active", "coming_soon"] }).notNull().default("coming_soon"),
}, (table) => [uniqueIndex("markets_slug_unique").on(table.slug)]);

export const organizationLocations = sqliteTable("organization_locations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  marketId: text("market_id").references(() => markets.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  locationType: text("location_type", { enum: ["office", "remote"] }).notNull().default("office"),
  address: text("address"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (table) => [index("idx_locations_org_active").on(table.organizationId, table.active)]);

export const bundles = sqliteTable("bundles", {
  id: text("id").primaryKey(),
  marketId: text("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  vendorName: text("vendor_name").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  customerPriceCents: integer("customer_price_cents").notNull(),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
}, (table) => [index("idx_bundles_market_active").on(table.marketId, table.active)]);

export const bundleItems = sqliteTable("bundle_items", {
  id: text("id").primaryKey(),
  bundleId: text("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  productId: text("product_id").references(() => vendorProducts.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [index("idx_bundle_items_bundle").on(table.bundleId)]);

export const recommendations = sqliteTable("recommendations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
  employeeEventId: text("employee_event_id").references(() => employeeEvents.id, { onDelete: "set null" }),
  rewardType: text("reward_type").notNull(),
  title: text("title").notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  recommendationScore: integer("recommendation_score").notNull(),
  recommendationReason: text("recommendation_reason").notNull(),
  somethingDifferent: integer("something_different", { mode: "boolean" }).notNull().default(false),
  status: text("status", { enum: ["recommended", "awaiting_approval", "approved", "rejected"] }).notNull().default("recommended"),
  createdAt: text("created_at").notNull(),
}, (table) => [
  index("idx_recommendations_org_status").on(table.organizationId, table.status),
  index("idx_recommendations_employee").on(table.employeeId),
]);

export const approvalRequests = sqliteTable("approval_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  approvalLevel: text("approval_level", { enum: ["manager", "admin", "owner"] }).notNull(),
  amountCents: integer("amount_cents").notNull().default(0),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_approvals_org_status").on(table.organizationId, table.status)]);

export const conciergeRequests = sqliteTable("concierge_requests", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "restrict" }),
  occasion: text("occasion").notNull(),
  budgetCents: integer("budget_cents").notNull(),
  deliveryDate: text("delivery_date").notNull(),
  status: text("status", { enum: ["submitted", "planning", "recommendation_ready", "awaiting_approval", "approved", "ordered", "delivered"] }).notNull().default("submitted"),
  recommendation: text("recommendation"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_concierge_org_status").on(table.organizationId, table.status)]);

export const teamCelebrations = sqliteTable("team_celebrations", {
  id: text("id").primaryKey(),
  organizationId: text("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  eventType: text("event_type").notNull(),
  eventDate: text("event_date").notNull(),
  department: text("department"),
  rewardMode: text("reward_mode", { enum: ["individual", "team_experience"] }).notNull(),
  budgetCents: integer("budget_cents").notNull().default(0),
  status: text("status").notNull().default("planned"),
  createdAt: text("created_at").notNull(),
}, (table) => [index("idx_team_celebrations_org_date").on(table.organizationId, table.eventDate)]);

export const vendorAvailability = sqliteTable("vendor_availability", {
  id: text("id").primaryKey(),
  marketId: text("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  vendorName: text("vendor_name").notNull(),
  minimumNoticeHours: integer("minimum_notice_hours").notNull().default(48),
  availableDays: text("available_days").notNull().default("[]"),
  blackoutDates: text("blackout_dates").notNull().default("[]"),
  deliveryHours: text("delivery_hours").notNull().default("{}"),
  fulfillmentMethod: text("fulfillment_method", { enum: ["vendor_delivery", "perkjoy_arranged", "pickup", "third_party"] }).notNull().default("vendor_delivery"),
}, (table) => [index("idx_vendor_availability_market").on(table.marketId)]);
