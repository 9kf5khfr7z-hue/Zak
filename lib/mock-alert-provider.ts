type AlertIncident = {
  id: string;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  kind?: string;
  occurrenceCount?: number;
  screen?: string;
  source: string;
};

export type MockAlert = {
  incidentId: string;
  title: string;
  content: string;
  createdAt: string;
  delivered: boolean;
};

const alerts: MockAlert[] = [];
const ALERT_WINDOW_MS = 10 * 60 * 1000;
const MAX_ALERTS = 50;

export async function notifyWithMockAlert(incident: AlertIncident): Promise<boolean> {
  if (!incident.severity || !["HIGH", "CRITICAL"].includes(incident.severity)) return false;
  const recent = alerts.find((alert) => alert.incidentId === incident.id && Date.now() - new Date(alert.createdAt).getTime() < ALERT_WINDOW_MS);
  if (recent) return false;
  alerts.unshift({
    incidentId: incident.id,
    title: incident.severity === "CRITICAL" ? "عطل حرج في ZAK" : "عطل مهم في ZAK",
    content: `${incident.kind ?? "UNKNOWN"} · ${incident.occurrenceCount ?? 1} مرة · ${incident.screen ?? incident.source}`,
    createdAt: new Date().toISOString(),
    delivered: true,
  });
  alerts.splice(MAX_ALERTS);
  return true;
}

export function getMockAlerts(): MockAlert[] {
  return [...alerts];
}

export function resetMockAlerts(): void {
  alerts.splice(0, alerts.length);
}
