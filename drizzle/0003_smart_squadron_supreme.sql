CREATE TABLE `employee_locations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`organization_location_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`organization_location_id`) REFERENCES `organization_locations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employee_locations_employee_unique` ON `employee_locations` (`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_employee_locations_location` ON `employee_locations` (`organization_location_id`);--> statement-breakpoint
CREATE TABLE `marketplace_listings` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`market_id` text NOT NULL,
	`vendor_availability_id` text NOT NULL,
	`rating_tenths` integer DEFAULT 49 NOT NULL,
	`preference_tags` text DEFAULT '[]' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `vendor_products`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`market_id`) REFERENCES `markets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`vendor_availability_id`) REFERENCES `vendor_availability`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `marketplace_listings_product_market_unique` ON `marketplace_listings` (`product_id`,`market_id`);--> statement-breakpoint
CREATE INDEX `idx_marketplace_listings_market_active` ON `marketplace_listings` (`market_id`,`active`);