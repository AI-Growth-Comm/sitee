CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`clientName` varchar(256) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `audits` ADD `contentAudit` json;--> statement-breakpoint
ALTER TABLE `audits` ADD `roadmap` json;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_auditId_audits_id_fk` FOREIGN KEY (`auditId`) REFERENCES `audits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `reports` ADD CONSTRAINT `reports_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;