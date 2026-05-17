ALTER TABLE `wbs` ADD `project_id` text REFERENCES projects(id);--> statement-breakpoint
ALTER TABLE `wbs_tasks` ADD `status` text DEFAULT 'todo' NOT NULL;