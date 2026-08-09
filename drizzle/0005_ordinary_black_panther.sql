CREATE TABLE `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`plan` text NOT NULL,
	`status` text DEFAULT 'trial' NOT NULL,
	`monthly_recurring_revenue_cents` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `subscriptions_organization_unique` ON `subscriptions` (`organization_id`);--> statement-breakpoint
CREATE INDEX `idx_subscriptions_status` ON `subscriptions` (`status`);--> statement-breakpoint
ALTER TABLE `concierge_requests` ADD `service_fee_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_products` ADD `vendor_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_products` ADD `delivery_cost_cents` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_products` ADD `platform_fee_cents` integer DEFAULT 0 NOT NULL;