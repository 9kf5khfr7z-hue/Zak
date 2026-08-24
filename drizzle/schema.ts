import { double, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar, decimal } from "drizzle-orm/mysql-core";

/** Core user table backing the auth flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "driver", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const driverProfiles = mysqlTable("driver_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  displayName: varchar("displayName", { length: 120 }).notNull(),
  photoUrl: text("photoUrl"),
  rating: decimal("rating", { precision: 3, scale: 2 }).default("5.00").notNull(),
  phone: varchar("phone", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliveryOrders = mysqlTable("delivery_orders", {
  id: int("id").autoincrement().primaryKey(),
  orderNumber: varchar("orderNumber", { length: 64 }).notNull().unique(),
  customerUserId: int("customerUserId").notNull(),
  driverId: int("driverId"),
  status: mysqlEnum("status", ["pending", "accepted", "preparing", "picked_up", "on_the_way", "delivered", "cancelled"]).default("pending").notNull(),
  restaurantReceivedAt: timestamp("restaurantReceivedAt"),
  preparingAt: timestamp("preparingAt"),
  driverPickedUpAt: timestamp("driverPickedUpAt"),
  deliveredAt: timestamp("deliveredAt"),
  etaMinutes: int("etaMinutes"),
  driverLatitude: double("driverLatitude"),
  driverLongitude: double("driverLongitude"),
  destinationLatitude: double("destinationLatitude"),
  destinationLongitude: double("destinationLongitude"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const errorEvents = mysqlTable("error_events", {
  id: int("id").autoincrement().primaryKey(),
  eventId: varchar("eventId", { length: 64 }).notNull().unique(),
  fingerprint: varchar("fingerprint", { length: 255 }).notNull(),
  severity: mysqlEnum("severity", ["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("MEDIUM").notNull(),
  kind: varchar("kind", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["OPEN", "ACKNOWLEDGED", "RESOLVED"]).default("OPEN").notNull(),
  message: text("message").notNull(),
  source: varchar("source", { length: 120 }).notNull(),
  screen: varchar("screen", { length: 120 }),
  action: varchar("action", { length: 120 }),
  appVersion: varchar("appVersion", { length: 32 }),
  platform: varchar("platform", { length: 32 }),
  osVersion: varchar("osVersion", { length: 64 }),
  requestId: varchar("requestId", { length: 128 }),
  stackTrace: text("stackTrace"),
  occurrenceCount: int("occurrenceCount").default(1).notNull(),
  affectedUsers: int("affectedUsers").default(1).notNull(),
  firstSeenAt: timestamp("firstSeenAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  fingerprintIdx: index("error_events_fingerprint_idx").on(table.fingerprint),
  statusSeverityIdx: index("error_events_status_severity_idx").on(table.status, table.severity),
  lastSeenIdx: index("error_events_last_seen_idx").on(table.lastSeenAt),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type InsertDriverProfile = typeof driverProfiles.$inferInsert;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = typeof deliveryOrders.$inferInsert;
export type ErrorEvent = typeof errorEvents.$inferSelect;
export type InsertErrorEvent = typeof errorEvents.$inferInsert;
