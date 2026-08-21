import { describe, expect, it } from "vitest";
import {
  ZAK_SERVICE_CENTER,
  distanceInKm,
  isWithinZakDeliveryRadius,
} from "../lib/delivery-radius";

describe("ZAK delivery radius", () => {
  it("accepts the service center", () => {
    expect(distanceInKm(ZAK_SERVICE_CENTER, ZAK_SERVICE_CENTER)).toBe(0);
    expect(isWithinZakDeliveryRadius(ZAK_SERVICE_CENTER)).toBe(true);
  });

  it("rejects a clearly distant destination", () => {
    expect(isWithinZakDeliveryRadius({ latitude: 33.1, longitude: 13.19 })).toBe(false);
  });
});
