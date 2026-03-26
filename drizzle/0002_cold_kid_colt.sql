CREATE TABLE `employees` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(20) NOT NULL,
	`empName` varchar(255) NOT NULL,
	`empRole` varchar(100),
	`department` varchar(100),
	`empIsActive` boolean NOT NULL DEFAULT true,
	`empCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`empUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `employees_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_draft_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`whatsappMessageId` int NOT NULL,
	`replyText` text NOT NULL,
	`toPhone` varchar(20) NOT NULL,
	`originalWaMessageId` varchar(512),
	`waReplyStatus` enum('pending','approved','rejected','sent') NOT NULL DEFAULT 'pending',
	`waReplyApprovedAt` timestamp,
	`waReplySentAt` timestamp,
	`waReplyCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`waReplyUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_draft_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`waMessageId` varchar(512) NOT NULL,
	`senderPhone` varchar(20) NOT NULL,
	`senderName` varchar(255),
	`messageType` varchar(50) NOT NULL DEFAULT 'text',
	`messageText` text,
	`waClassification` enum('problem','question','update','request'),
	`waAiSummary` text,
	`waAiAnalysis` json,
	`waIsProcessed` boolean NOT NULL DEFAULT false,
	`waReceivedAt` timestamp NOT NULL,
	`waCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`),
	CONSTRAINT `whatsapp_messages_waMessageId_unique` UNIQUE(`waMessageId`)
);
