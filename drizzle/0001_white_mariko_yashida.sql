CREATE TABLE `approval_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`approval_level` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_approvals_org_status` ON `approval_requests` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `bundle_items` (
	`id` text PRIMARY KEY NOT NULL,
	`bundle_id` text NOT NULL,
	`product_id` text,
	`name` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	FOREIGN KEY (`bundle_id`) REFERENCES `bundles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `vendor_products`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_bundle_items_bundle` ON `bundle_items` (`bundle_id`);--> statement-breakpoint
CREATE TABLE `bundles` (
	`id` text PRIMARY KEY NOT NULL,
	`market_id` text NOT NULL,
	`vendor_name` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`customer_price_cents` integer NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_bundles_market_active` ON `bundles` (`market_id`,`active`);--> statement-breakpoint
CREATE TABLE `celebration_preferences` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`food` text DEFAULT '{}' NOT NULL,
	`rewards` text DEFAULT '{}' NOT NULL,
	`interests` text DEFAULT '[]' NOT NULL,
	`shirt_size` text,
	`dietary` text DEFAULT '[]' NOT NULL,
	`share_with_hr` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `celebration_preferences_employee_unique` ON `celebration_preferences` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_celebration_preferences_org` ON `celebration_preferences` (`organization_id`);--> statement-breakpoint
CREATE TABLE `celebration_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`invite_token` text NOT NULL,
	`invite_expires_at` text NOT NULL,
	`completeness` integer DEFAULT 0 NOT NULL,
	`privacy_mode` text DEFAULT 'recommendations_only' NOT NULL,
	`work_mode` text DEFAULT 'office' NOT NULL,
	`preferred_delivery` text DEFAULT 'workplace' NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `celebration_profiles_employee_unique` ON `celebration_profiles` (`employee_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `celebration_profiles_invite_token_unique` ON `celebration_profiles` (`invite_token`);--> statement-breakpoint
CREATE INDEX `idx_celebration_profiles_org` ON `celebration_profiles` (`organization_id`);--> statement-breakpoint
CREATE TABLE `celebration_types` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`category` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`manual_only` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `celebration_types_org_slug_unique` ON `celebration_types` (`organization_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_celebration_types_org_active` ON `celebration_types` (`organization_id`,`active`);--> statement-breakpoint
CREATE TABLE `concierge_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`occasion` text NOT NULL,
	`budget_cents` integer NOT NULL,
	`delivery_date` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`recommendation` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_concierge_org_status` ON `concierge_requests` (`organization_id`,`status`);--> statement-breakpoint
CREATE TABLE `employee_events` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`celebration_type_id` text,
	`title` text NOT NULL,
	`event_date` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'needs_attention' NOT NULL,
	`reward_summary` text DEFAULT 'No celebration configured' NOT NULL,
	`handled_steps` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`celebration_type_id`) REFERENCES `celebration_types`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_employee_events_org_date` ON `employee_events` (`organization_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `idx_employee_events_org_status` ON `employee_events` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_employee_events_employee` ON `employee_events` (`employee_id`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`city` text NOT NULL,
	`state` text NOT NULL,
	`country` text DEFAULT 'US' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`launch_status` text DEFAULT 'coming_soon' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `markets_slug_unique` ON `markets` (`slug`);--> statement-breakpoint
CREATE TABLE `organization_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`market_id` text,
	`name` text NOT NULL,
	`location_type` text DEFAULT 'office' NOT NULL,
	`address` text,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_locations_org_active` ON `organization_locations` (`organization_id`,`active`);--> statement-breakpoint
CREATE TABLE `recommendations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`employee_event_id` text,
	`reward_type` text NOT NULL,
	`title` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`recommendation_score` integer NOT NULL,
	`recommendation_reason` text NOT NULL,
	`something_different` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'recommended' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_event_id`) REFERENCES `employee_events`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_recommendations_org_status` ON `recommendations` (`organization_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_recommendations_employee` ON `recommendations` (`employee_id`);--> statement-breakpoint
CREATE TABLE `team_celebrations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`title` text NOT NULL,
	`event_type` text NOT NULL,
	`event_date` text NOT NULL,
	`department` text,
	`reward_mode` text NOT NULL,
	`budget_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'planned' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_team_celebrations_org_date` ON `team_celebrations` (`organization_id`,`event_date`);--> statement-breakpoint
CREATE TABLE `vendor_availability` (
	`id` text PRIMARY KEY NOT NULL,
	`market_id` text NOT NULL,
	`vendor_name` text NOT NULL,
	`minimum_notice_hours` integer DEFAULT 48 NOT NULL,
	`available_days` text DEFAULT '[]' NOT NULL,
	`blackout_dates` text DEFAULT '[]' NOT NULL,
	`delivery_hours` text DEFAULT '{}' NOT NULL,
	`fulfillment_method` text DEFAULT 'vendor_delivery' NOT NULL,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vendor_availability_market` ON `vendor_availability` (`market_id`);