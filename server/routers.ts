import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import * as db from "./db";

const trackingInput = z.object({
  orderNumber: z.string().min(1).max(64),
  status: z.enum(["pending", "accepted", "preparing", "picked_up", "on_the_way", "delivered", "cancelled"]).optional(),
  restaurantReceivedAt: z.date().nullable().optional(),
  preparingAt: z.date().nullable().optional(),
  driverPickedUpAt: z.date().nullable().optional(),
  deliveredAt: z.date().nullable().optional(),
  etaMinutes: z.number().int().min(0).max(240).nullable().optional(),
  driverLatitude: z.number().min(-90).max(90).nullable().optional(),
  driverLongitude: z.number().min(-180).max(180).nullable().optional(),
  destinationLatitude: z.number().min(-90).max(90).nullable().optional(),
  destinationLongitude: z.number().min(-180).max(180).nullable().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  orders: router({
    getTracking: protectedProcedure
      .input(z.object({ orderNumber: z.string().min(1).max(64) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role === "driver") {
          return db.getOrderTrackingForDriver(input.orderNumber, ctx.user.id);
        }
        return db.getOrderTrackingForUser(input.orderNumber, ctx.user.id);
      }),
    sync: protectedProcedure
      .input(trackingInput)
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role === "driver") {
          return db.updateDeliveryOrderByDriver(input.orderNumber, ctx.user.id, input);
        }
        return db.upsertDeliveryOrder({
          ...input,
          orderNumber: input.orderNumber,
          customerUserId: ctx.user.id,
        });
      }),
  }),
  driverProfile: router({
    save: protectedProcedure
      .input(z.object({
        displayName: z.string().min(2).max(120),
        photoUrl: z.string().url().nullable().optional(),
        rating: z.string().regex(/^([0-5])(\\.[0-9]{1,2})?$/).optional(),
        phone: z.string().max(32).nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "driver") {
          throw new Error("Only driver accounts can save a driver profile");
        }
        return db.upsertDriverProfile({ userId: ctx.user.id, ...input });
      }),
  }),
  admin: router({
    health: adminProcedure.query(() => ({ ok: true })),
    errorMonitoring: router({
      list: adminProcedure
        .input(z.object({
          severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
          status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]).optional(),
          kind: z.string().trim().min(1).max(80).optional(),
          from: z.coerce.date().optional(),
          to: z.coerce.date().optional(),
          limit: z.number().int().min(1).max(500).optional(),
        }).optional())
        .query(({ input }) => db.listErrorEvents(input)),
      get: adminProcedure
        .input(z.object({ eventId: z.string().trim().min(1).max(128) }))
        .query(({ input }) => db.getErrorEventById(input.eventId)),
      updateStatus: adminProcedure
        .input(z.object({
          eventId: z.string().trim().min(1).max(128),
          status: z.enum(["OPEN", "ACKNOWLEDGED", "RESOLVED"]),
        }))
        .mutation(({ input }) => db.updateErrorEventStatus(input.eventId, input.status)),
    }),
  }),
});

export type AppRouter = typeof appRouter;
