import { describe, expect, it } from "vitest";
import { canTransition, getAllowedTransitions } from "../shared/order-state";
import { hasPermission } from "../shared/permissions";
import { isRtl, translate } from "../lib/localization";

describe("ZAK order state machine", () => {
  it("allows only the correct actor to accept an assigned order", () => {
    expect(canTransition("DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "driver")).toBe(true);
    expect(canTransition("DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "customer")).toBe(false);
  });

  it("does not allow transitions from terminal states", () => {
    expect(getAllowedTransitions("DELIVERED")).toEqual([]);
    expect(canTransition("DELIVERED", "IN_DELIVERY", "driver")).toBe(false);
  });
});

describe("ZAK role permissions", () => {
  it("keeps customer permissions scoped to customer actions", () => {
    expect(hasPermission("customer", "orders:create")).toBe(true);
    expect(hasPermission("customer", "drivers:manage")).toBe(false);
  });

  it("gives admin operational access", () => {
    expect(hasPermission("admin", "admin:operate")).toBe(true);
    expect(hasPermission("admin", "support:manage")).toBe(true);
  });
});

describe("ZAK localization", () => {
  it("returns Arabic labels and RTL direction", () => {
    expect(translate("ar", "brand")).toBe("زاك");
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});
