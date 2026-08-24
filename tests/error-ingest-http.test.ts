import express from "express";
import http from "node:http";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { upsertErrorEvent } = vi.hoisted(() => ({
  upsertErrorEvent: vi.fn(),
}));

vi.mock("../server/db", () => ({ upsertErrorEvent }));

import { createErrorIngestHandler } from "../server/_core/error-ingest";
import { resetServerMonitoring } from "../server/_core/error-monitoring";
import { mockPushProvider, resetPushProvider } from "../server/_core/push-provider";

const validSession = "mock-development-session";

function createTestServer() {
  const app = express();
  app.use(express.json({ limit: "128kb" }));
  app.post(
    "/api/errors/ingest",
    createErrorIngestHandler(async (req) => {
      if (req.headers.cookie !== `session=${validSession}`) {
        throw new Error("Invalid session cookie");
      }
      return { id: 9001 };
    }),
  );
  return app.listen(0);
}

async function request(
  server: http.Server,
  body: unknown,
  options: { session?: boolean; rawBody?: string } = {},
): Promise<{ status: number; body: Record<string, unknown> }> {
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server has no address");
  const rawBody = options.rawBody ?? JSON.stringify(body);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: address.port,
        path: "/api/errors/ingest",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(rawBody),
          ...(options.session ? { Cookie: `session=${validSession}` } : {}),
        },
      },
      (res) => {
        let responseBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (responseBody += chunk));
        res.on("end", () => {
          resolve({ status: res.statusCode ?? 0, body: JSON.parse(responseBody) });
        });
      },
    );
    req.on("error", reject);
    req.end(rawBody);
  });
}

async function flushMonitoring() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("HTTP Error Ingest", () => {
  let server: http.Server;

  beforeEach(() => {
    resetServerMonitoring();
    resetPushProvider();
    upsertErrorEvent.mockReset().mockResolvedValue(undefined);
    server = createTestServer();
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  });

  it("accepts a valid authenticated error and returns 202", async () => {
    const result = await request(
      server,
      {
        message: "Database timeout for order 123",
        source: "Customer Checkout",
        kind: "API_ERROR",
        severity: "HIGH",
        requestId: "http-req-001",
      },
      { session: true },
    );

    expect(result.status).toBe(202);
    expect(result.body).toMatchObject({ accepted: true, userId: 9001 });
    await flushMonitoring();
    expect(upsertErrorEvent).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: "http-req-001", severity: "HIGH" }),
    );
  });

  it("rejects requests without a valid session", async () => {
    const result = await request(server, { message: "unauthenticated" });

    expect(result.status).toBe(401);
    expect(result.body).toEqual({ accepted: false, error: "Authentication required" });
    expect(upsertErrorEvent).not.toHaveBeenCalled();
  });

  it("rejects invalid and oversized payloads after authentication", async () => {
    const invalid = await request(server, [], { session: true });
    expect(invalid.status).toBe(400);

    const oversized = await request(server, { message: "x" }, {
      session: true,
      rawBody: JSON.stringify({ message: "x".repeat(70 * 1024) }),
    });
    expect(oversized.status).toBe(413);
  });

  it("redacts sensitive values and ignores client-controlled status and role", async () => {
    const result = await request(
      server,
      {
        message: "failed password=secret token=abc123",
        source: "mobile",
        severity: "CRITICAL",
        stackTrace: "Authorization: Bearer very-secret-token",
        status: "RESOLVED",
        role: "admin",
      },
      { session: true },
    );

    expect(result.status).toBe(202);
    await flushMonitoring();
    const persisted = upsertErrorEvent.mock.calls[0]?.[0];
    expect(persisted.message).not.toContain("secret");
    expect(persisted.stackTrace).not.toContain("very-secret-token");
    expect(persisted).not.toHaveProperty("status");
    expect(persisted).not.toHaveProperty("role");
  });

  it("pushes HIGH and CRITICAL only", async () => {
    for (const severity of ["HIGH", "CRITICAL", "MEDIUM", "LOW"]) {
      const result = await request(server, { message: `case-${severity}`, source: "HTTP", severity }, { session: true });
      expect(result.status).toBe(202);
    }

    expect(mockPushProvider.getAlerts().map((alert) => alert.severity).sort()).toEqual(["CRITICAL", "HIGH"]);
  });

  it("does not send a duplicate push for the same event", async () => {
    const payload = { message: "same database timeout", source: "HTTP", kind: "DB_ERROR", severity: "CRITICAL" };
    expect((await request(server, payload, { session: true })).status).toBe(202);
    expect((await request(server, payload, { session: true })).status).toBe(202);

    expect(mockPushProvider.getAlerts()).toHaveLength(1);
    expect(mockPushProvider.getAlerts()[0]?.severity).toBe("CRITICAL");
  });
});
