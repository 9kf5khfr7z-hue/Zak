CREATE TABLE `delivery_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(64) NOT NULL,
	`customerUserId` int NOT NULL,
	`driverId` int,
	`status` enum('pending','accepted','preparing','picked_up','on_the_way','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`restaurantReceivedAt` timestamp,
	`preparingAt` timestamp,
	`driverPickedUpAt` timestamp,
	`deliveredAt` timestamp,
	`etaMinutes` int,
	`driverLatitude` double,
	`driverLongitude` double,
	`destinationLatitude` double,
	`destinationLongitude` double,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `delivery_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `delivery_orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `driver_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(120) NOT NULL,
	`photoUrl` text,
	`rating` decimal(3,2) NOT NULL DEFAULT '5.00',
	`phone` varchar(32),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_profiles_userId_unique` UNIQUE(`userId`)
);
