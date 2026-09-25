CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`attendance` text,
	`guests` integer,
	`note` text,
	`created_at` integer NOT NULL
);
