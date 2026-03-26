ALTER TABLE `tasks` ADD `suggestedCategory` varchar(100);--> statement-breakpoint
ALTER TABLE `tasks` ADD `suggestionConfidence` int;--> statement-breakpoint
ALTER TABLE `tasks` ADD `suggestionReasoning` text;--> statement-breakpoint
ALTER TABLE `tasks` ADD `suggestionConfirmed` boolean;