CREATE TABLE `approval_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`name` text NOT NULL,
	`reward_type` text NOT NULL,
	`minimum_cents` integer DEFAULT 0 NOT NULL,
	`maximum_cents` integer,
	`approval_level` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_approval_policies_org_active` ON `approval_policies` (`organization_id`,`active`);--> statement-breakpoint
CREATE TABLE `team_celebration_participants` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`team_celebration_id` text NOT NULL,
	`employee_id` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`team_celebration_id`) REFERENCES `team_celebrations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `team_celebration_participant_unique` ON `team_celebration_participants` (`team_celebration_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `idx_team_participants_employee` ON `team_celebration_participants` (`employee_id`);