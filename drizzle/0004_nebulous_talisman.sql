CREATE INDEX `error_events_fingerprint_idx` ON `error_events` (`fingerprint`);--> statement-breakpoint
CREATE INDEX `error_events_status_severity_idx` ON `error_events` (`status`,`severity`);--> statement-breakpoint
CREATE INDEX `error_events_last_seen_idx` ON `error_events` (`lastSeenAt`);