CREATE TABLE `gift_history` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`recommendation_id` text,
	`title` text NOT NULL,
	`reward_type` text NOT NULL,
	`occasion` text NOT NULL,
	`amount_cents` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recommendation_id`) REFERENCES `recommendations`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_gift_history_employee_created` ON `gift_history` (`employee_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_gift_history_org_created` ON `gift_history` (`organization_id`,`created_at`);