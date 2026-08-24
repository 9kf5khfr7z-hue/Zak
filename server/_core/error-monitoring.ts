import type { NextFunction, Request, Response } from "express";
import { createHash } from "node:crypto";

import { upsertErrorEvent } from "../db";
import { getPushProvider } from "./push-provider";

export type ServerSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type ServerIncident = {
  id: string;
  fingerprint: string;
  kind: string;
  severity: ServerSeverity;
  message: string;
  source: string;
  action?: string;
  requestId?: string;
  statusCode?: number;
  createdAt: string;
  lastSeenAt: string;
  occurrenceCount: number;
  affectedUsers: number;
  resolved: boolean;
  stackTrace?: string;
};

type MockAlert = { incidentId: string; title: string; content: string; createdAt: string };
const incidents: ServerIncident[] = [];
const alerts: MockAlert[] = [];
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const MAX_INCIDENTS = 100;
const MAX_ALERTS = 50;
let installed = false;

function redact(value: string): string {
  return value
    .replace(/authorization\s*:\s*bearer\s+[^\s,;]+/gi, "Authorization: Bearer [REDACTED]")
    .replace(/(password|otp|token|authorization|cookie|card(number)?)\s*[:=]\s*[^\s,;]+/gi, "$1: [REDACTED]")
    .replace(/bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]")
    .slice(0, 12000);
}

function fingerprint(message: string, source: string, kind: string): string {
  return `${kind}|${source}|${message.toLowerCase().replace(/\d+/g, "#")}`;
}

function persistentEventId(key: string, timestamp: number): string {
  const bucket = Math.floor(timestamp / DEDUPE_WINDOW_MS);
  const digest = createHash("sha256").update(`${key}|${bucket}`).digest("hex").slice(0, 24).toUpperCase();
  return `SRV-${digest}`;
}

async function persistIncident(incident: ServerIncident): Promise<void> {
  try {
    const persisted = await upsertErrorEvent({
      eventId: incident.id,
      fingerprint: incident.fingerprint,
      severity: incident.severity,
      kind: incident.kind,
      message: incident.message,
      source: incident.source,
      action: incident.action,
      requestId: incident.requestId,
      stackTrace: incident.stackTrace,
      occurrenceCount: 1,
      affectedUsers: 1,
      firstSeenAt: new Date(incident.createdAt),
      lastSeenAt: new Date(incident.lastSeenAt),
    });
    if (!persisted && process.env.NODE_ENV === "production") {
      console.error("[monitoring] Persistent error storage is unavailable in production");
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[monitoring] Failed to persist server incident", error);
    } else {
      console.warn("[monitoring] Using Development memory fallback", error);
    }
  }
}

function alertFor(incident: ServerIncident): void {
  if (incident.severity !== "HIGH" && incident.severity !== "CRITICAL") return;
  if (alerts.some((alert) => alert.incidentId === incident.id)) return;
  const alert = {
    incidentId: incident.id,
    severity: incident.severity,
    title: incident.severity === "CRITICAL" ? "عطل حرج في الخادم" : "عطل مهم في الخادم",
    content: `${incident.kind} · ${incident.occurrenceCount} مرة · ${incident.source}`,
    createdAt: new Date().toISOString(),
  };
  alerts.unshift({ incidentId: alert.incidentId, title: alert.title, content: alert.content, createdAt: alert.createdAt });
  alerts.splice(MAX_ALERTS);
  void Promise.resolve(getPushProvider().send(alert)).catch((error) => {
    console.error("[monitoring] Push provider failed", error);
  });
}

export type IngestServerIncidentInput = {
  message?: unknown;
  source?: unknown;
  kind?: unknown;
  severity?: unknown;
  action?: unknown;
  requestId?: unknown;
  statusCode?: unknown;
  stackTrace?: unknown;
};

function safeString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? redact(trimmed).slice(0, maxLength) : undefined;
}

function safeSeverity(value: unknown): ServerSeverity {
  return value === "LOW" || value === "MEDIUM" || value === "HIGH" || value === "CRITICAL" ? value : "MEDIUM";
}

export function ingestServerIncident(input: IngestServerIncidentInput): ServerIncident {
  const message = safeString(input.message, 12000) ?? "Client reported an unspecified error";
  const source = safeString(input.source, 120) ?? "client";
  const kind = safeString(input.kind, 64) ?? "CLIENT_ERROR";
  const action = safeString(input.action, 120);
  const requestId = safeString(input.requestId, 128);
  const stackTrace = safeString(input.stackTrace, 12000);
  const statusCode = typeof input.statusCode === "number" && Number.isInteger(input.statusCode) && input.statusCode >= 100 && input.statusCode <= 599
    ? input.statusCode
    : undefined;

  return captureServerIncident({
    error: message,
    source,
    kind,
    severity: safeSeverity(input.severity),
    action,
    requestId,
    statusCode,
    stackTrace,
  });
}

export function captureServerIncident(input: { error: unknown; source: string; kind?: string; severity?: ServerSeverity; action?: string; requestId?: string; statusCode?: number;   affectedUsers?: number; stackTrace?: string }): ServerIncident {
  const rawMessage = input.error instanceof Error ? input.error.message : typeof input.error === "string" ? input.error : "Unexpected server error";
  const message = redact(rawMessage.trim() || "Unexpected server error");
  const kind = input.kind ?? "SERVER_ERROR";
  const source = input.source.trim() || "server";
  const now = new Date().toISOString();
  const key = fingerprint(message, source, kind);
  const existingIndex = incidents.findIndex((item) => item.fingerprint === key && Date.now() - new Date(item.lastSeenAt).getTime() <= DEDUPE_WINDOW_MS);
  if (existingIndex >= 0) {
    const existing = incidents[existingIndex];
    const updated = { ...existing, lastSeenAt: now, resolved: false, occurrenceCount: existing.occurrenceCount + 1, affectedUsers: existing.affectedUsers + (input.affectedUsers ?? 0), severity: input.severity ?? existing.severity, statusCode: input.statusCode ?? existing.statusCode };
    incidents.splice(existingIndex, 1);
    incidents.unshift(updated);
    void persistIncident({ ...updated, id: persistentEventId(key, Date.now()) });
    alertFor(updated);
    return updated;
  }
  const incident: ServerIncident = { id: persistentEventId(key, Date.now()), fingerprint: key, kind, severity: input.severity ?? "HIGH", message, source, action: input.action, requestId: input.requestId, statusCode: input.statusCode, createdAt: now, lastSeenAt: now, occurrenceCount: 1, affectedUsers: Math.max(1, input.affectedUsers ?? 1), resolved: false, stackTrace: input.stackTrace ? redact(input.stackTrace) : input.error instanceof Error ? redact(input.error.stack ?? "") : undefined };
  incidents.unshift(incident);
  incidents.splice(MAX_INCIDENTS);
  void persistIncident(incident);
  alertFor(incident);
  return incident;
}

export function createServerMonitoringMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      if (res.statusCode >= 500) captureServerIncident({ error: `HTTP ${res.statusCode}`, source: `${req.method} ${req.path}`, kind: "API_ERROR", severity: res.statusCode >=  httpStatusCriticalThreshold ? "CRITICAL" : "HIGH", requestId: String(req.headers["x-request-id"] ?? "") || undefined, statusCode: res.statusCode });
    });
    next();
  };
}

const httpStatusCriticalThreshold = 500;

export function getServerMonitoringSnapshot() {
  return { incidents: incidents.map((item) => ({ ...item })), alerts: alerts.map((item) => ({ ...item })), summary: { critical: incidents.filter((item) => !item.resolved && item.severity === "CRITICAL").length, high: incidents.filter((item) => !item.resolved && item.severity === "HIGH").length, medium: incidents.filter((item) => !item.resolved && item.severity === "MEDIUM").length, low: incidents.filter((item) => !item.resolved && item.severity === "LOW").length, errorsToday: incidents.reduce((sum, item) => sum + item.occurrenceCount, 0), affectedUsers: incidents.reduce((sum, item) => sum + item.affectedUsers, 0) } };
}

export function resetServerMonitoring(): void {
  incidents.splice(0, incidents.length);
  alerts.splice(0, alerts.length);
}

export function installServerErrorMonitoring(): void {
  if (installed) return;
  installed = true;
  process.on("uncaughtException", (error) => { captureServerIncident({ error, source: "Node runtime", kind: "UNHANDLED_EXCEPTION", severity: "CRITICAL" }); console.error("[monitoring] uncaught exception captured"); });
  process.on("unhandledRejection", (reason) => { captureServerIncident({ error: reason, source: "Node runtime", kind: "UNHANDLED_REJECTION", severity: "CRITICAL" }); console.error("[monitoring] unhandled rejection captured"); });
}
