import type { Request, RequestHandler, Response } from "express";

import { ingestServerIncident, type IngestServerIncidentInput } from "./error-monitoring";

type IngestUser = { id: number };
type AuthenticateRequest = (req: Request) => Promise<IngestUser>;
type IncidentIngestor = (input: IngestServerIncidentInput) => { id: string };

const MAX_PAYLOAD_BYTES = 64 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function authErrorStatus(error: unknown): number {
  return error instanceof Error && /session|auth|forbidden|invalid/i.test(error.message) ? 401 : 500;
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
