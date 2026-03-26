CREATE TABLE `draft_replies` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailId` int NOT NULL,
	`subject` varchar(500),
	`body` text NOT NULL,
	`toAddress` varchar(320) NOT NULL,
	`status` enum('pending','approved','rejected','sent') NOT NULL DEFAULT 'pending',
	`approvedAt` timestamp,
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `draft_replies_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailAddress` varchar(320) NOT NULL,
	`imapHost` varchar(255) NOT NULL DEFAULT 'imap.one.com',
	`imapPort` int NOT NULL DEFAULT 993,
	`smtpHost` varchar(255) NOT NULL DEFAULT 'send.one.com',
	`smtpPort` int NOT NULL DEFAULT 465,
	`password` varchar(512) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`lastSyncAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emails` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`accountId` int NOT NULL,
	`messageId` varchar(512),
	`uid` int,
	`subject` text,
	`fromAddress` varchar(320),
	`fromName` varchar(255),
	`toAddress` text,
	`body` text,
	`bodyHtml` text,
	`receivedAt` timestamp,
	`isRead` boolean NOT NULL DEFAULT false,
	`classification` enum('invoice','task','reminder','general','irrelevant') DEFAULT 'general',
	`aiSummary` text,
	`aiAnalysis` json,
	`isProcessed` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emails_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailId` int,
	`title` varchar(500) NOT NULL,
	`description` text,
	`priority` enum('low','medium','high','urgent') NOT NULL DEFAULT 'medium',
	`status` enum('pending','in_progress','completed','dismissed') NOT NULL DEFAULT 'pending',
	`dueDate` timestamp,
	`category` varchar(100),
	`source` enum('email','whatsapp','manual') NOT NULL DEFAULT 'email',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
