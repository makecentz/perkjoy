CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`actor_id` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_audit_org_created` ON `audit_logs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `automation_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`event_type` text NOT NULL,
	`reward_type` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`timing` text DEFAULT 'On the day' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`approval_required` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_rules_org_active` ON `automation_rules` (`organization_id`,`active`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`email` text NOT NULL,
	`department` text NOT NULL,
	`job_title` text DEFAULT 'Team Member' NOT NULL,
	`birthday_month` integer NOT NULL,
	`birthday_day` integer NOT NULL,
	`hire_date` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_employees_org_status` ON `employees` (`organization_id`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_org_email_unique` ON `employees` (`organization_id`,`email`);--> statement-breakpoint
CREATE TABLE `local_orders` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`product_id` text NOT NULL,
	`delivery_date` text NOT NULL,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'paid' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`product_id`) REFERENCES `vendor_products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_local_orders_org_created` ON `local_orders` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`monthly_budget_cents` integer DEFAULT 50000 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `organizations_owner_id_unique` ON `organizations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `reward_provider_events` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`provider_event_id` text NOT NULL,
	`payload` text NOT NULL,
	`processed_at` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `provider_events_provider_id_unique` ON `reward_provider_events` (`provider`,`provider_event_id`);--> statement-breakpoint
CREATE TABLE `rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`event_key` text NOT NULL,
	`recognition_type` text NOT NULL,
	`message` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`status` text NOT NULL,
	`provider` text DEFAULT 'tremendous_sandbox' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `rewards_org_event_key_unique` ON `rewards` (`organization_id`,`event_key`);--> statement-breakpoint
CREATE INDEX `idx_rewards_org_created` ON `rewards` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `vendor_products` (
	`id` text PRIMARY KEY NOT NULL,
	`vendor_name` text NOT NULL,
	`name` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`price_cents` integer NOT NULL,
	`delivery_fee_cents` integer NOT NULL,
	`serves_people` integer NOT NULL,
	`demo` integer DEFAULT true NOT NULL
);
