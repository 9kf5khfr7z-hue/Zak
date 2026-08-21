import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    removeItem: async (key: string) => { storage.delete(key); },
    clear: async () => { storage.clear(); },
  },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestOtp, verifyOtp } from "../lib/otp";

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe("local OTP", () => {
  it("returns a development code and accepts it once", async () => {
    const challenge = await requestOtp("091-123-4567");
    expect(challenge.devCode).toBe("123456");
    expect((await verifyOtp("0911234567", "123456")).ok).toBe(true);
    expect((await verifyOtp("0911234567", "123456")).ok).toBe(false);
  });

  it("rejects a wrong code", async () => {
    await requestOtp("0911234567");
    const result = await verifyOtp("0911234567", "000000");
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });
});
