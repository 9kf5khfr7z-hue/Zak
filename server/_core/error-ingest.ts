import type { Request, RequestHandler, Response } from "express";

import { ingestServerIncident, type IngestServerIncidentInput } from "./error-monitoring";

type IngestUser = { id: number };
type AuthenticateRequest = (req: Request) => Promise<IngestUser>;
type IncidentIngestor = (input: IngestServerIncidentInput) => { id: string };

type RateLimitEntry = { count: number; resetAt: number };

const MAX_PAYLOAD_BYTES = 64 * 1024;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_MAX_REQUESTS = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function authErrorStatus(error: unknown): number {
  return error instanceof Error && /session|auth|forbidden|invalid/i.test(error.message) ? 401 : 500;
}

function getClientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : req.ip || "unknown";
  const session = typeof req.headers.cookie === "string" && req.headers.cookie.length > 0 ? "session" : "anonymous";
  return `${ip}:${session}`;
}

export type ErrorIngestSecurityOptions = {
  windowMs?: number;
  maxRequests?: number;
  allowedOrigins?: string[];
  now?: () => number;
};

/** Route-level security; CORS is not used as authentication. */
export function createErrorIngestSecurityMiddleware(
  options: ErrorIngestSecurityOptions = {},
): RequestHandler {
  const windowMs = options.windowMs ?? Number(process.env.ERROR_INGEST_RATE_WINDOW_MS ?? DEFAULT_RATE_LIMIT_WINDOW_MS);
  const maxRequests = options.maxRequests ?? Number(process.env.ERROR_INGEST_RATE_MAX ?? DEFAULT_RATE_LIMIT_MAX_REQUESTS);
  const allowedOrigins = options.allowedOrigins ?? (process.env.ERROR_INGEST_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const now = options.now ?? Date.now;
  const entries = new Map<string, RateLimitEntry>();

  return (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      res.status(403).json({ accepted: false, error: "Origin not allowed" });
      return;
    }
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With, X-Request-ID");
    if (req.method === "OPTIONS") {
      res.sendStatus(204);
      return;
    }

    const timestamp = now();
    const key = getClientKey(req);
    const current = entries.get(key);
    if (!current || timestamp >= current.resetAt) {
      entries.set(key, { count: 1, resetAt: timestamp + windowMs });
      next();
      return;
    }
    if (current.count >= maxRequests) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((current.resetAt - timestamp) / 1000)));
      res.status(429).json({ accepted: false, error: "Too many error events" });
      return;
    }
    current.count += 1;
    next();
  };
}

export function createErrorIngestHandler(
  authenticateRequest: AuthenticateRequest,
  ingest: IncidentIngestor = ingestServerIncident,
): RequestHandler {
  return async (req: Request, res: Response) => {
    try {
      const user = await authenticateRequest(req);
      const body = req.body;
      const payloadSize = Buffer.byteLength(JSON.stringify(body ?? {}), "utf8");

      if (!isRecord(body)) {
        res.status(400).json({ accepted: false, error: "Invalid error payload" });
        return;
      }

      if (payloadSize > MAX_PAYLOAD_BYTES) {
        res.status(413).json({ accepted: false, error: "Error payload is too large" });
        return;
      }

      const incident = ingest({
        message: body.message,
        source: body.source,
        kind: body.kind,
        severity: body.severity,
        action: body.action,
        requestId: body.requestId ?? req.headers["x-request-id"],
        statusCode: body.statusCode,
        stackTrace: body.stackTrace,
      });

      res.status(202).json({ accepted: true, incidentId: incident.id, userId: user.id });
    } catch (error) {
      const status = authErrorStatus(error);
      res.status(status).json({
        accepted: false,
        error: status === 401 ? "Authentication required" : "Unable to accept error event",
      });
    }
  };
}

export const errorIngestLimits = {
  maxPayloadBytes: MAX_PAYLOAD_BYTES,
  defaultRateLimitWindowMs: DEFAULT_RATE_LIMIT_WINDOW_MS,
  defaultRateLimitMaxRequests: DEFAULT_RATE_LIMIT_MAX_REQUESTS,
};
