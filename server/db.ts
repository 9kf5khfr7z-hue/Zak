import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { deliveryOrders, driverProfiles, InsertDeliveryOrder, InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getOrderTrackingForUser(orderNumber: string, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: deliveryOrders, driver: driverProfiles })
    .from(deliveryOrders)
    .leftJoin(driverProfiles, eq(deliveryOrders.driverId, driverProfiles.id))
    .where(and(eq(deliveryOrders.orderNumber, orderNumber), eq(deliveryOrders.customerUserId, userId)))
    .limit(1);
  return result[0] ?? undefined;
}

export async function upsertDeliveryOrder(input: InsertDeliveryOrder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orderNumber, ...updateFields } = input;
  await db.insert(deliveryOrders).values(input).onDuplicateKeyUpdate({ set: updateFields });
  const result = await db.select().from(deliveryOrders).where(eq(deliveryOrders.orderNumber, orderNumber)).limit(1);
  return result[0];
}

export async function updateDeliveryOrderByDriver(orderNumber: string, driverUserId: number, input: Partial<InsertDeliveryOrder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const profile = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, driverUserId)).limit(1);
  const driver = profile[0];
  if (!driver) throw new Error("Driver profile not found");
  await db.update(deliveryOrders).set({ ...input, driverId: driver.id }).where(eq(deliveryOrders.orderNumber, orderNumber));
  return getOrderTrackingForDriver(orderNumber, driverUserId);
}

export async function upsertDriverProfile(input: { userId: number; displayName: string; photoUrl?: string | null; rating?: string; phone?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(driverProfiles).values(input).onDuplicateKeyUpdate({
    set: {
      displayName: input.displayName,
      photoUrl: input.photoUrl ?? null,
      rating: input.rating ?? "5.00",
      phone: input.phone ?? null,
    },
  });
  const result = await db.select().from(driverProfiles).where(eq(driverProfiles.userId, input.userId)).limit(1);
  return result[0];
}

export async function getOrderTrackingForDriver(orderNumber: string, driverUserId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({ order: deliveryOrders, driver: driverProfiles })
    .from(deliveryOrders)
    .innerJoin(driverProfiles, eq(deliveryOrders.driverId, driverProfiles.id))
    .where(and(eq(deliveryOrders.orderNumber, orderNumber), eq(driverProfiles.userId, driverUserId)))
    .limit(1);
  return result[0] ?? undefined;
}
