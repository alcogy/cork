CREATE TABLE `login_attempts` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_address` text NOT NULL,
	`email` text NOT NULL,
	`attempted_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE cascade
);
