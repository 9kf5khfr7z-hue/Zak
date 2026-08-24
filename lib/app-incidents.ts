import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiBaseUrl } from "../constants/oauth";
import { notifyWithMockAlert } from "./mock-alert-provider";

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentKind =
  | "UI_CRASH"
  | "API_ERROR"
  | "CREATE_ORDER_FAILED"
  | "ORDER_STATUS_FAILED"
  | "AUTH_ERROR"
  | "OTP_ERROR"
  | "PAYMENT_ERROR"
  | "LOCATION_ERROR"
  | "NOTIFICATION_ERROR"
  | "UPLOAD_ERROR"
  | "TIMEOUT"
  | "SERVER_ERROR"
  | "DATABASE_ERROR"
  | "PERMISSION_ERROR"
  | "UNHANDLED_EXCEPTION"
  | "UNKNOWN";

export type AppIncident = {
  id: string;
  fingerprint?: string;
  message: string;
  source: string;
  createdAt: string;
  lastSeenAt?: string;
  resolved: boolean;
  severity?: IncidentSeverity;
  kind?: IncidentKind;
  action?: string;
  screen?: string;
  appVersion?: string;
  device?: string;
  os?: string;
  requestId?: string;
  stackTrace?: string;
  occurrenceCount?: number;
  affectedUsers?: number;
};

export type IncidentDateFilter = "all" | "today" | "last7days";
export type IncidentSort = "newest" | "oldest" | "most-occurrences";
export type IncidentQuery = {
  dateFilter?: IncidentDateFilter;
  source?: string;
  kind?: IncidentKind | "";
  severity?: IncidentSeverity | "";
  search?: string;
  sort?: IncidentSort;
  now?: Date;
};

export type IncidentContext = Partial<Pick<AppIncident, "severity" | "kind" | "action" | "screen" | "appVersion" | "device" | "os" | "requestId" | "stackTrace">> & {
  userId?: string;
};

const INCIDENTS_KEY = "zak_app_incidents_v2";
const LEGACY_INCIDENTS_KEY = "zak_app_incidents_v1";
const MAX_INCIDENTS = 50;
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;

const sensitivePatterns = [
  /password\s*[:=]\s*[^\s,;]+/gi,
  /otp\s*[:=]\s*[^\s,;]+/gi,
  /token\s*[:=]\s*[^\s,;]+/gi,
  /authorization\s*[:=]\s*[^\s,;]+/gi,
  /card(number)?\s*[:=]\s*[^\s,;]+/gi,
];

export function redactSensitive(value: string): string {
  return sensitivePatterns.reduce((result, pattern) => result.replace(pattern, (match) => `${match.split(/[:=]/)[0]}: [REDACTED]`), value).slice(0, 4000);
}

function normalizeError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "حدث خلل غير معروف داخل التطبيق";
  return redactSensitive(message.trim() || "حدث خلل غير معروف داخل التطبيق");
}

function inferKind(message: string, source: string): IncidentKind {
  const value = `${source} ${message}`.toLowerCase();
  if (value.includes("timeout") || value.includes("timed out")) return "TIMEOUT";
  if (value.includes("order") && value.includes("create")) return "CREATE_ORDER_FAILED";
  if (value.includes("otp")) return "OTP_ERROR";
  if (value.includes("payment") || value.includes("دفع")) return "PAYMENT_ERROR";
  if (value.includes("location") || value.includes("موقع")) return "LOCATION_ERROR";
  if (source.includes("واجهة") || source.includes("عرض")) return "UI_CRASH";
  return "UNKNOWN";
}

function fingerprintFor(message: string, source: string, kind: IncidentKind): string {
  return `${kind}|${source}|${message.toLowerCase().replace(/\d+/g, "#")}`;
}

function normalizeIncident(value: Partial<AppIncident>): AppIncident | null {
  if (!value.id || !value.message || !value.createdAt) return null;
  const createdAt = value.createdAt;
  return {
    id: value.id,
    fingerprint: value.fingerprint ?? fingerprintFor(value.message, value.source ?? "واجهة التطبيق", value.kind ?? "UNKNOWN"),
    message: redactSensitive(value.message),
    source: value.source ?? "واجهة التطبيق",
    createdAt,
    lastSeenAt: value.lastSeenAt ?? createdAt,
    resolved: Boolean(value.resolved),
    severity: value.severity ?? "MEDIUM",
    kind: value.kind ?? "UNKNOWN",
    action: value.action,
    screen: value.screen ?? value.source,
    appVersion: value.appVersion,
    device: value.device,
    os: value.os,
    requestId: value.requestId,
    stackTrace: value.stackTrace ? redactSensitive(value.stackTrace).slice(0, 12000) : undefined,
    occurrenceCount: Math.max(1, value.occurrenceCount ?? 1),
    affectedUsers: Math.max(1, value.affectedUsers ?? 1),
  };
}

async function readIncidents(): Promise<AppIncident[]> {
  try {
    let raw = await AsyncStorage.getItem(INCIDENTS_KEY);
    if (!raw) {
      raw = await AsyncStorage.getItem(LEGACY_INCIDENTS_KEY);
    }
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => normalizeIncident(item as Partial<AppIncident>)).filter((item): item is AppIncident => Boolean(item));
  } catch {
    return [];
  }
}

export async function getAppIncidents(): Promise<AppIncident[]> {
  return readIncidents();
}

export type DevServerMonitoringSnapshot = {
  incidents: Array<{ id: string; kind: string; severity: IncidentSeverity; message: string; source: string; createdAt: string; occurrenceCount: number; affectedUsers: number; resolved: boolean }>;
  alerts: Array<{ incidentId: string; title: string; content: string; createdAt: string }>;
  summary: { critical: number; high: number; medium: number; low: number; errorsToday: number; affectedUsers: number };
};

export async function getDevServerMonitoringSnapshot(): Promise<DevServerMonitoringSnapshot | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/dev/monitoring`);
    if (!response.ok) return null;
    return (await response.json()) as DevServerMonitoringSnapshot;
  } catch {
    return null;
  }
}

export async function getOpenIncidentCount(): Promise<number> {
  const incidents = await readIncidents();
  return incidents.filter((incident) => !incident.resolved).length;
}

export async function recordAppIncident(error: unknown, source = "واجهة التطبيق", context: IncidentContext = {}): Promise<AppIncident> {
  const message = normalizeError(error);
  const now = new Date().toISOString();
  const kind = context.kind ?? inferKind(message, source);
  const fingerprint = fingerprintFor(message, source, kind);
  const incidents = await readIncidents();
  const existingIndex = incidents.findIndex((incident) => incident.fingerprint === fingerprint && Date.now() - new Date(incident.lastSeenAt ?? incident.createdAt).getTime() <= DEDUPE_WINDOW_MS);
  let incident: AppIncident;
  if (existingIndex >= 0) {
    const existing = incidents[existingIndex];
    incident = { ...existing, lastSeenAt: now, resolved: false, occurrenceCount: (existing.occurrenceCount ?? 1) + 1, affectedUsers: (existing.affectedUsers ?? 1) + (context.userId ? 1 : 0), severity: context.severity ?? existing.severity ?? "MEDIUM", requestId: context.requestId ?? existing.requestId, stackTrace: context.stackTrace ? redactSensitive(context.stackTrace).slice(0, 12000) : existing.stackTrace };
    incidents.splice(existingIndex, 1);
  } else {
    incident = { id: `BUG-${String(Date.now()).slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`, fingerprint, message, source, createdAt: now, lastSeenAt: now, resolved: false, severity: context.severity ?? "MEDIUM", kind, action: context.action, screen: context.screen ?? source, appVersion: context.appVersion, device: context.device, os: context.os, requestId: context.requestId, stackTrace: context.stackTrace ? redactSensitive(context.stackTrace).slice(0, 12000) : undefined, occurrenceCount: 1, affectedUsers: 1 };
  }
  await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify([incident, ...incidents].slice(0, MAX_INCIDENTS)));
  void notifyWithMockAlert(incident);
  void reportIncidentToDevServer(incident);
  return incident;
}

export function getIncidentSources(incidents: AppIncident[]): string[] {
  return Array.from(new Set(incidents.map((incident) => incident.source.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
}

export function getIncidentKinds(incidents: AppIncident[]): IncidentKind[] {
  return Array.from(new Set(incidents.map((incident) => incident.kind).filter((kind): kind is IncidentKind => Boolean(kind)))).sort();
}

export function isWithinDateFilter(value: string, dateFilter: IncidentDateFilter, now: Date): boolean {
  if (dateFilter === "all") return true;
  const createdAt = new Date(value);
  if (Number.isNaN(createdAt.getTime())) return false;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (dateFilter === "today") return createdAt >= startOfToday;
  const sevenDaysAgo = new Date(startOfToday);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  return createdAt >= sevenDaysAgo;
}

export function queryAppIncidents(incidents: AppIncident[], query: IncidentQuery = {}): AppIncident[] {
  const dateFilter = query.dateFilter ?? "all";
  const sort = query.sort ?? "newest";
  const now = query.now ?? new Date();
  const search = query.search?.trim().toLowerCase();
  const filtered = incidents.filter((incident) => {
    const searchMatches = !search || [incident.id, incident.message, incident.source, incident.screen, incident.action, incident.requestId, incident.kind].filter(Boolean).some((value) => value!.toLowerCase().includes(search));
    return (!query.source || incident.source === query.source) && (!query.kind || incident.kind === query.kind) && (!query.severity || incident.severity === query.severity) && searchMatches && isWithinDateFilter(incident.createdAt, dateFilter, now);
  });
  return [...filtered].sort((a, b) => {
    if (sort === "most-occurrences") return (b.occurrenceCount ?? 1) - (a.occurrenceCount ?? 1);
    const aTime = new Date(a.lastSeenAt ?? a.createdAt).getTime();
    const bTime = new Date(b.lastSeenAt ?? b.createdAt).getTime();
    const safeATime = Number.isNaN(aTime) ? 0 : aTime;
    const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
    return sort === "oldest" ? safeATime - safeBTime : safeBTime - safeATime;
  });
}

export function getIncidentHealthSummary(incidents: AppIncident[], now = new Date()) {
  const today = incidents.filter((incident) => isWithinDateFilter(incident.createdAt, "today", now));
  return {
    critical: incidents.filter((incident) => !incident.resolved && incident.severity === "CRITICAL").length,
    high: incidents.filter((incident) => !incident.resolved && incident.severity === "HIGH").length,
    medium: incidents.filter((incident) => !incident.resolved && incident.severity === "MEDIUM").length,
    low: incidents.filter((incident) => !incident.resolved && incident.severity === "LOW").length,
    errorsToday: today.reduce((sum, incident) => sum + (incident.occurrenceCount ?? 1), 0),
    affectedUsers: today.reduce((sum, incident) => sum + (incident.affectedUsers ?? 1), 0),
  };
}

export async function resolveAllAppIncidents(): Promise<void> {
  const incidents = await readIncidents();
  await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify(incidents.map((incident) => ({ ...incident, resolved: true }))));
}

export async function resetAppIncidents(): Promise<void> {
  await AsyncStorage.removeItem(INCIDENTS_KEY);
  await AsyncStorage.removeItem(LEGACY_INCIDENTS_KEY);
}

async function reportIncidentToDevServer(incident: AppIncident): Promise<void> {
  if (process.env.NODE_ENV === "production") return;
  try {
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl.replace(/\/$/, "")}/api/dev/monitoring/incidents`;
    const controller = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const timeout = setTimeout(() => controller?.abort(), 1500);
    await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", "X-ZAK-Platform": Platform.OS }, body: JSON.stringify({ id: incident.id, message: incident.message, source: incident.source, screen: incident.screen, action: incident.action, severity: incident.severity, kind: incident.kind, appVersion: incident.appVersion, device: incident.device, os: incident.os, requestId: incident.requestId, stackTrace: incident.stackTrace }), signal: controller?.signal });
    clearTimeout(timeout);
  } catch {
    // Monitoring must never create a second user-facing failure.
  }
}

export const INCIDENTS_STORAGE_KEY = INCIDENTS_KEY;
