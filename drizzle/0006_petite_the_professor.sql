CREATE TABLE `invoice_details` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`emailId` int NOT NULL,
	`taskId` int,
	`supplier` varchar(500) NOT NULL,
	`invoiceNumber` varchar(255),
	`amount` varchar(100),
	`currency` varchar(10) DEFAULT 'DKK',
	`paymentDate` varchar(50),
	`dueDate` varchar(50),
	`products` text,
	`lineItems` json,
	`invoiceStatus` enum('pending','reviewed','sent_to_economic','paid','rejected') NOT NULL DEFAULT 'pending',
	`sentToEconomicAt` timestamp,
	`eEconomicResponse` json,
	`rawExtraction` json,
	`invCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`invUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `invoice_details_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`supplierName` varchar(500) NOT NULL,
	`supplierEmail` varchar(320),
	`eEconomicEndpoint` varchar(1000),
	`eEconomicApiKey` varchar(500),
	`eEconomicAgreement` varchar(500),
	`isConfigured` boolean NOT NULL DEFAULT false,
	`ssCreatedAt` timestamp NOT NULL DEFAULT (now()),
	`ssUpdatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_settings_id` PRIMARY KEY(`id`)
);
