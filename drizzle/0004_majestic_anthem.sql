ALTER TABLE `tasks` ADD `lastActivityAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `tasks` ADD `autoArchivedAt` timestamp;