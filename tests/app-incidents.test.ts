import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();
vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: async (key: string) => storage.get(key) ?? null,
    setItem: async (key: string, value: string) => { storage.set(key, value); },
    removeItem: async (key: string) => { storage.delete(key); },
  },
}));

import {
  getAppIncidents,
  getOpenIncidentCount,
  recordAppIncident,
  resetAppIncidents,
  resolveAllAppIncidents,
  queryAppIncidents,
} from "../lib/app-incidents";

beforeEach(async () => {
  storage.clear();
  await resetAppIncidents();
});

describe("app incidents", () => {
  it("records a readable incident and exposes it as an open admin alert", async () => {
    const incident = await recordAppIncident(new Error("تعذر تحميل الطلب"), "شاشة الطلب");

    expect(incident).toMatchObject({ message: "تعذر تحميل الطلب", source: "شاشة الطلب", resolved: false });
    await expect(getOpenIncidentCount()).resolves.toBe(1);
    await expect(getAppIncidents()).resolves.toHaveLength(1);
  });

  it("normalizes unknown errors and keeps the log capped", async () => {
    const first = await recordAppIncident(null);
    expect(first.message).toBe("حدث خلل غير معروف داخل التطبيق");

    for (let index = 0; index < 55; index += 1) {
      await recordAppIncident(`خلل ${index}`);
    }

    const incidents = await getAppIncidents();
    expect(incidents).toHaveLength(50);
  });

  it("filters by date and source, then sorts newest or oldest", () => {
    const now = new Date("2026-08-24T12:00:00.000Z");
    const incidents = [
      { id: "old", message: "قديم", source: "شاشة الطلب", createdAt: "2026-08-10T10:00:00.000Z", resolved: false },
      { id: "recent", message: "حديث", source: "شاشة الطلب", createdAt: "2026-08-23T10:00:00.000Z", resolved: false },
      { id: "today", message: "اليوم", source: "شاشة الدخول", createdAt: "2026-08-24T09:00:00.000Z", resolved: false },
    ];

    expect(queryAppIncidents(incidents, { dateFilter: "last7days", source: "شاشة الطلب", now }).map((item) => item.id)).toEqual(["recent"]);
    expect(queryAppIncidents(incidents, { dateFilter: "today", now }).map((item) => item.id)).toEqual(["today"]);
    expect(queryAppIncidents(incidents, { sort: "oldest", now }).map((item) => item.id)).toEqual(["old", "recent", "today"]);
  });

  it("allows the admin to mark all open incidents as reviewed", async () => {
    await recordAppIncident("خلل تجريبي");
    await expect(getOpenIncidentCount()).resolves.toBe(1);

    await resolveAllAppIncidents();

    await expect(getOpenIncidentCount()).resolves.toBe(0);
    await expect(getAppIncidents()).resolves.toMatchObject([{ resolved: true }]);
  });
});
