import AsyncStorage from "@react-native-async-storage/async-storage";

export type AppIncident = {
  id: string;
  message: string;
  source: string;
  createdAt: string;
  resolved: boolean;
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
