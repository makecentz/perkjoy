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
