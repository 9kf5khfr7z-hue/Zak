import { describe, expect, it } from "vitest";
import { assertTransition, canTransition, getAllowedTransitions, type OrderStatus } from "../shared/order-state";

const happyPath: OrderStatus[] = ["PENDING", "SEARCHING_DRIVER", "DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "DRIVER_ARRIVED", "PICKED_UP", "IN_DELIVERY", "DELIVERED"];

describe("order-state.test.ts", () => {
  it("accepts the complete PENDING to DELIVERED path", () => {
    expect(happyPath.slice(0, -1).every((from, index) => canTransition(from, happyPath[index + 1], index < 2 ? "system" : "driver"))).toBe(true);
    expect(getAllowedTransitions("DELIVERED")).toEqual([]);
  });

  it("rejects skipped, backward, and terminal transitions", () => {
    expect(canTransition("PENDING", "DRIVER_ASSIGNED", "system")).toBe(false);
    expect(canTransition("IN_DELIVERY", "PICKED_UP", "driver")).toBe(false);
    expect(canTransition("DELIVERED", "CANCELLED", "admin")).toBe(false);
    expect(() => assertTransition("DRIVER_ASSIGNED", "DELIVERED", "driver")).toThrow("Illegal order transition");
  });

  it("enforces actor permissions for each stage", () => {
    expect(canTransition("PENDING", "SEARCHING_DRIVER", "customer")).toBe(false);
    expect(canTransition("SEARCHING_DRIVER", "DRIVER_ASSIGNED", "admin")).toBe(true);
    expect(canTransition("DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "driver")).toBe(true);
    expect(canTransition("DRIVER_ACCEPTED", "DRIVER_ARRIVED", "merchant")).toBe(false);
    expect(canTransition("IN_DELIVERY", "DELIVERED", "customer")).toBe(true);
  });

  it("requires a reason when cancelling", () => {
    expect(() => assertTransition("DRIVER_ACCEPTED", "CANCELLED", "customer")).toThrow("Cancellation reason is required");
    expect(() => assertTransition("DRIVER_ACCEPTED", "CANCELLED", "customer", { reason: "تغيير العنوان" })).not.toThrow();
  });
});
