CREATE TABLE `admins` (
	`id` varchar(36) NOT NULL,
	`email` varchar(200) NOT NULL,
	`password_hash` varchar(255) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`last_login_at` timestamp,
	CONSTRAINT `admins_id` PRIMARY KEY(`id`),
	CONSTRAINT `admins_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `answers` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`field_id` varchar(80) NOT NULL,
	`value_json` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	`source` enum('client','admin_prefill') NOT NULL DEFAULT 'client',
	CONSTRAINT `answers_id` PRIMARY KEY(`id`),
	CONSTRAINT `answers_submission_field_unique` UNIQUE(`submission_id`,`field_id`)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` varchar(36) NOT NULL,
	`actor_id` varchar(36),
	`action` enum('project.create','project.delete','project.revoke','project.reopen','project.mark_ongoing','project.update_priority','project.export_json','project.purge','admin.login','admin.login_failed','admin.logout') NOT NULL,
	`project_id` varchar(36),
	`metadata_json` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `internal_notes` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`body` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `internal_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `meta` (
	`key` varchar(64) NOT NULL,
	`value` text NOT NULL,
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `meta_key` PRIMARY KEY(`key`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` varchar(36) NOT NULL,
	`label` varchar(200) NOT NULL,
	`hotel_name` varchar(200),
	`contact_email` varchar(200) NOT NULL,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`status` enum('draft','awaiting','in_progress','submitted','reopened','purged') NOT NULL DEFAULT 'draft',
	`token_hash` varchar(64) NOT NULL,
	`token_revoked_at` timestamp,
	`ongoing_engagement` boolean NOT NULL DEFAULT false,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`sent_at` timestamp,
	`last_admin_activity_at` timestamp NOT NULL DEFAULT (now()),
	`submitted_at` timestamp,
	`last_edited_at` timestamp,
	`created_by` varchar(36) NOT NULL,
	CONSTRAINT `projects_id` PRIMARY KEY(`id`),
	CONSTRAINT `projects_token_hash_unique` UNIQUE(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `scores` (
	`id` varchar(36) NOT NULL,
	`submission_id` varchar(36) NOT NULL,
	`name` enum('automation_opportunity','operational_complexity','modernization_readiness','digital_maturity') NOT NULL,
	`value` int NOT NULL,
	`band` enum('low','medium','high') NOT NULL,
	`basis_json` text NOT NULL,
	`computed_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scores_id` PRIMARY KEY(`id`),
	CONSTRAINT `scores_submission_name_unique` UNIQUE(`submission_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` varchar(36) NOT NULL,
	`project_id` varchar(36) NOT NULL,
	`completion_pct` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `submissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `submissions_project_id_unique` UNIQUE(`project_id`)
);
--> statement-breakpoint
ALTER TABLE `answers` ADD CONSTRAINT `answers_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_actor_id_admins_id_fk` FOREIGN KEY (`actor_id`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_log` ADD CONSTRAINT `audit_log_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_notes` ADD CONSTRAINT `internal_notes_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `internal_notes` ADD CONSTRAINT `internal_notes_author_id_admins_id_fk` FOREIGN KEY (`author_id`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `projects` ADD CONSTRAINT `projects_created_by_admins_id_fk` FOREIGN KEY (`created_by`) REFERENCES `admins`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `scores` ADD CONSTRAINT `scores_submission_id_submissions_id_fk` FOREIGN KEY (`submission_id`) REFERENCES `submissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `submissions` ADD CONSTRAINT `submissions_project_id_projects_id_fk` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `audit_log_project_created_idx` ON `audit_log` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `audit_log_action_created_idx` ON `audit_log` (`action`,`created_at`);--> statement-breakpoint
CREATE INDEX `internal_notes_project_created_idx` ON `internal_notes` (`project_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `projects_status_activity_idx` ON `projects` (`status`,`last_admin_activity_at`);