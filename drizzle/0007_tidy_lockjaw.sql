CREATE TABLE `automation_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`run_key` text NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`rules_evaluated` integer DEFAULT 0 NOT NULL,
	`moments_evaluated` integer DEFAULT 0 NOT NULL,
	`scheduled_count` integer DEFAULT 0 NOT NULL,
	`approval_count` integer DEFAULT 0 NOT NULL,
	`duplicate_count` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `automation_runs_org_key_unique` ON `automation_runs` (`organization_id`,`run_key`);--> statement-breakpoint
CREATE INDEX `idx_automation_runs_org_created` ON `automation_runs` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`message` text NOT NULL,
	`entity_type` text,
	`entity_id` text,
	`action_label` text,
	`action_href` text,
	`read_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_org_created` ON `notifications` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_notifications_org_read` ON `notifications` (`organization_id`,`read_at`);