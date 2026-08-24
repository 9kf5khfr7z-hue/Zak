import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { captureServerIncident, createServerMonitoringMiddleware, getServerMonitoringSnapshot, installServerErrorMonitoring } from "./error-monitoring";
import { createErrorIngestHandler } from "./error-ingest";
import { runRetentionHeartbeat } from "./error-retention";
import { sdk } from "./sdk";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  installServerErrorMonitoring();
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(createServerMonitoringMiddleware());

  app.post("/api/errors/ingest", createErrorIngestHandler((req) => sdk.authenticateRequest(req)));

  app.post("/api/scheduled/error-retention", async (req, res) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron && user.role !== "admin") {
        res.status(403).json({ ok: false, error: "Admin or scheduled-task authorization required" });
        return;
      }
      const result = await runRetentionHeartbeat();
      res.status(result.status === "SUCCESS" ? 200 : 500).json(result);
    } catch (_error) {
      res.status(401).json({ ok: false, error: "Scheduled-task authentication required" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    app.get("/api/dev/monitoring", (_req, res) => res.json(getServerMonitoringSnapshot()));
    app.post("/api/dev/monitoring/incidents", (req, res) => {
      const incident = captureServerIncident({ error: typeof req.body?.message === "string" ? req.body.message : "Client incident", source: typeof req.body?.source === "string" ? req.body.source : "client", kind: typeof req.body?.kind === "string" ? req.body.kind : "CLIENT_ERROR", severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(req.body?.severity) ? req.body.severity : "MEDIUM", action: typeof req.body?.action === "string" ? req.body.action : undefined, requestId: typeof req.body?.requestId === "string" ? req.body.requestId : undefined, stackTrace: undefined });
      res.status(202).json({ accepted: true, incidentId: incident.id });
    });
  }

  registerStorageProxy(app);
  registerOAuthRoutes(app);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
