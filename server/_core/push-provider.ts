export type PushSeverity = "HIGH" | "CRITICAL";

export type PushAlert = {
  incidentId: string;
  severity: PushSeverity;
  title: string;
  content: string;
  createdAt: string;
};

export interface PushProvider {
  send(alert: PushAlert): Promise<void> | void;
}

export class MockPushProvider implements PushProvider {
  private readonly delivered: PushAlert[] = [];

  send(alert: PushAlert): void {
    this.delivered.unshift({ ...alert });
  }

  getAlerts(): PushAlert[] {
    return this.delivered.map((alert) => ({ ...alert }));
  }

  reset(): void {
    this.delivered.splice(0, this.delivered.length);
  }
}

export type ProductionPushProviderConfig = {
  provider?: "onesignal";
  endpoint?: string;
  apiKey?: string;
  appId?: string;
  /** Optional public project identifier; OneSignal REST delivery uses appId. */
  projectId?: string;
  /** OneSignal segment(s) that contain ZAK administrators. */
  includedSegments?: string[];
  timeoutMs?: number;
  maxRetries?: number;
  rateLimitMs?: number;
  enabled?: boolean;
};

const DEFAULT_ONESIGNAL_ENDPOINT = "https://api.onesignal.com/notifications?c=push";
const DEFAULT_ADMIN_SEGMENT = "Admins";

export function productionPushConfigFromEnv(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): ProductionPushProviderConfig {
  return {
    provider: (env.PUSH_PROVIDER as "onesignal" | undefined) ?? "onesignal",
    endpoint: env.PUSH_API_ENDPOINT ?? DEFAULT_ONESIGNAL_ENDPOINT,
    apiKey: env.PUSH_API_KEY,
    appId: env.PUSH_PROJECT_ID,
    includedSegments: env.PUSH_ONESIGNAL_ADMIN_SEGMENT
      ? [env.PUSH_ONESIGNAL_ADMIN_SEGMENT]
      : [DEFAULT_ADMIN_SEGMENT],
    enabled: env.PUSH_ENABLED === "true",
    timeoutMs: env.PUSH_TIMEOUT_MS ? Number(env.PUSH_TIMEOUT_MS) : undefined,
    maxRetries: env.PUSH_MAX_RETRIES ? Number(env.PUSH_MAX_RETRIES) : undefined,
    rateLimitMs: env.PUSH_RATE_LIMIT_MS ? Number(env.PUSH_RATE_LIMIT_MS) : undefined,
  };
}

export function validateProductionPushConfig(
  config: ProductionPushProviderConfig,
): void {
  if (!config.enabled) return;
  if ((config.provider ?? "onesignal") !== "onesignal") {
    throw new Error("Production push provider must be configured as onesignal");
  }
  if (!config.endpoint || !config.apiKey || !config.appId) {
    throw new Error("OneSignal production push requires PUSH_API_KEY and PUSH_PROJECT_ID");
  }
  if (!/^https:\/\/api\.onesignal\.com\/notifications(?:\?c=push)?$/i.test(config.endpoint)) {
    throw new Error("OneSignal endpoint must be the official HTTPS notifications endpoint");
  }
  if (!/^os_v2_app_[A-Za-z0-9_-]+$/.test(config.apiKey)) {
    throw new Error("OneSignal App API key has an invalid format");
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(config.appId)) {
    throw new Error("OneSignal App ID must be a UUID v4");
  }
  const includedSegments = config.includedSegments ?? [DEFAULT_ADMIN_SEGMENT];
  if (!includedSegments.length || includedSegments.some((segment) => !segment.trim())) {
    throw new Error("OneSignal requires at least one administrator segment");
  }
  if (!Number.isFinite(config.timeoutMs ?? 5000) || (config.timeoutMs ?? 5000) <= 0) {
    throw new Error("Production push provider timeout must be positive");
  }
  if (!Number.isInteger(config.maxRetries ?? 2) || (config.maxRetries ?? 2) < 0) {
    throw new Error("Production push provider maxRetries must be a non-negative integer");
  }
}

/**
 * OneSignal REST adapter kept dormant until an approved provider and credentials
 * are configured. It never logs the API key or response body.
 */
export class ProductionPushProvider implements PushProvider {
  private readonly recent = new Map<string, number>();
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly rateLimitMs: number;
  private readonly backoffBaseMs: number;

  constructor(private readonly config: ProductionPushProviderConfig) {
    validateProductionPushConfig(config);
    this.timeoutMs = config.timeoutMs ?? 5000;
    this.maxRetries = config.maxRetries ?? 2;
    this.rateLimitMs = config.rateLimitMs ?? 10 * 60 * 1000;
    this.backoffBaseMs = 100;
  }

  async send(alert: PushAlert): Promise<void> {
    if (!this.config.enabled) {
      throw new Error("Production push provider is not enabled");
    }
    if (!this.config.endpoint || !this.config.apiKey || !this.config.appId) {
      throw new Error("OneSignal production push is not configured");
    }

    const now = Date.now();
    const lastSentAt = this.recent.get(alert.incidentId);
    if (lastSentAt !== undefined && now - lastSentAt < this.rateLimitMs) return;
    this.recent.set(alert.incidentId, now);

    const body = JSON.stringify({
      app_id: this.config.appId,
      included_segments: this.config.includedSegments ?? [DEFAULT_ADMIN_SEGMENT],
      headings: { en: alert.title },
      contents: { en: alert.content },
      name: `zak-error-${alert.incidentId}`,
      custom_data: {
        incident_id: alert.incidentId,
        severity: alert.severity,
        created_at: alert.createdAt,
      },
    });

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            Authorization: `Key ${this.config.apiKey}`,
            "content-type": "application/json",
          },
          body,
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`OneSignal returned HTTP ${response.status}`);
        return;
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.backoffBaseMs * 2 ** attempt));
        }
      } finally {
        clearTimeout(timeout);
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }

  resetRateLimit(): void {
    this.recent.clear();
  }
}

export const mockPushProvider = new MockPushProvider();

let activePushProvider: PushProvider = mockPushProvider;

export function setPushProvider(provider: PushProvider): void {
  activePushProvider = provider;
}

export function getPushProvider(): PushProvider {
  return activePushProvider;
}

export function resetPushProvider(): void {
  activePushProvider = mockPushProvider;
  mockPushProvider.reset();
}
