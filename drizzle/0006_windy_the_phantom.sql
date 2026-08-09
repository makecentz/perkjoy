CREATE TABLE `organization_settings` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`reminder_days` text DEFAULT '[30,14,7,3,1]' NOT NULL,
	`notification_preferences` text DEFAULT '{"eventReminders":true,"budgetAlerts":true,"rewardFailures":true,"deliveryUpdates":true}' NOT NULL,
	`celebration_style` text DEFAULT 'both' NOT NULL,
	`selected_template` text,
	`onboarding_completed` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
