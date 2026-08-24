import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppIncident = {
  id: string;
  message: string;
  source: string;
  createdAt: string;
  resolved: boolean;
};

export type IncidentDateFilter = "all" | "today" | "last7days";
export type IncidentSort = "newest" | "oldest";

export type IncidentQuery = {
  dateFilter?: IncidentDateFilter;
  source?: string;
  sort?: IncidentSort;
  now?: Date;
};

const INCIDENTS_KEY = "zak_app_incidents_v1";
const MAX_INCIDENTS = 50;

function normalizeError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  return "حدث خلل غير معروف داخل التطبيق";
}

async function readIncidents(): Promise<AppIncident[]> {
  try {
    const raw = await AsyncStorage.getItem(INCIDENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as AppIncident[]) : [];
  } catch {
    return [];
  }
}

export async function getAppIncidents(): Promise<AppIncident[]> {
  return readIncidents();
}

export async function getOpenIncidentCount(): Promise<number> {
  const incidents = await readIncidents();
  return incidents.filter((incident) => !incident.resolved).length;
}

export async function recordAppIncident(error: unknown, source = "واجهة التطبيق"): Promise<AppIncident> {
  const incident: AppIncident = {
    id: `incident-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    message: normalizeError(error),
    source,
    createdAt: new Date().toISOString(),
    resolved: false,
  };
  const incidents = await readIncidents();
  await AsyncStorage.setItem(INCIDENTS_KEY, JSON.stringify([incident, ...incidents].slice(0, MAX_INCIDENTS)));
  return incident;
}

export function getIncidentSources(incidents: AppIncident[]): string[] {
  return Array.from(new Set(incidents.map((incident) => incident.source.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "ar"));
}

function isWithinDateFilter(value: string, dateFilter: IncidentDateFilter, now: Date): boolean {
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
  const filtered = incidents.filter((incident) => {
    const sourceMatches = !query.source || incident.source === query.source;
    return sourceMatches && isWithinDateFilter(incident.createdAt, dateFilter, now);
  });

  return [...filtered].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    const safeATime = Number.isNaN(aTime) ? 0 : aTime;
    const safeBTime = Number.isNaN(bTime) ? 0 : bTime;
    return sort === "oldest" ? safeATime - safeBTime : safeBTime - safeATime;
  });
}

export async function resolveAllAppIncidents(): Promise<void> {
  const incidents = await readIncidents();
  await AsyncStorage.setItem(
    INCIDENTS_KEY,
    JSON.stringify(incidents.map((incident) => ({ ...incident, resolved: true }))),
  );
}

export async function resetAppIncidents(): Promise<void> {
  await AsyncStorage.removeItem(INCIDENTS_KEY);
}
