ALTER TABLE `tasks` ADD `urgencyScore` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `tasks` ADD `importanceScore` int DEFAULT 5;--> statement-breakpoint
ALTER TABLE `tasks` ADD `priorityScore` int DEFAULT 50;--> statement-breakpoint
ALTER TABLE `tasks` ADD `quadrant` enum('do_first','schedule','delegate','archive') DEFAULT 'schedule';--> statement-breakpoint
ALTER TABLE `tasks` ADD `escalationLevel` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `tasks` ADD `suggestedAction` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `isOverdue` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `tasks` ADD `snoozedUntil` timestamp;