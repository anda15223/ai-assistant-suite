CREATE TABLE `email_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`emailId` int NOT NULL,
	`userId` int NOT NULL,
	`filename` varchar(500) NOT NULL,
	`mimeType` varchar(100) NOT NULL,
	`size` int DEFAULT 0,
	`s3Key` varchar(1000) NOT NULL,
	`s3Url` varchar(2000) NOT NULL,
	`attachCreatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_attachments_id` PRIMARY KEY(`id`)
);
