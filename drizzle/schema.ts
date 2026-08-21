import { double, int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

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

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type DriverProfile = typeof driverProfiles.$inferSelect;
export type InsertDriverProfile = typeof driverProfiles.$inferInsert;
export type DeliveryOrder = typeof deliveryOrders.$inferSelect;
export type InsertDeliveryOrder = typeof deliveryOrders.$inferInsert;
