CREATE TABLE `auditCriteria` (
	`id` int AUTO_INCREMENT NOT NULL,
	`domain` varchar(512) NOT NULL,
	`sectionName` varchar(64) NOT NULL,
	`issueType` varchar(128) NOT NULL,
	`description` text NOT NULL,
	`suggestedFix` text,
	`severity` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`learnedFromAuditId` int,
	`active` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `auditCriteria_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `qualityInsights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`auditId` int NOT NULL,
	`overallAccuracy` int NOT NULL DEFAULT 0,
	`overallSummary` text,
	`sectionResults` json,
	`criteriaExtracted` int NOT NULL DEFAULT 0,
	`triggeredBy` enum('auto','manual') NOT NULL DEFAULT 'auto',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `qualityInsights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `auditCriteria` ADD CONSTRAINT `auditCriteria_learnedFromAuditId_audits_id_fk` FOREIGN KEY (`learnedFromAuditId`) REFERENCES `audits`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `qualityInsights` ADD CONSTRAINT `qualityInsights_auditId_audits_id_fk` FOREIGN KEY (`auditId`) REFERENCES `audits`(`id`) ON DELETE no action ON UPDATE no action;