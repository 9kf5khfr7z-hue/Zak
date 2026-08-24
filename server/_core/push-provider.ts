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
  endpoint: string;
  token: string;
  timeoutMs?: number;
  maxRetries?: number;
  rateLimitMs?: number;
  enabled?: boolean;
};

export function validateProductionPushConfig(
  config: ProductionPushProviderConfig,
): void {
  if (!config.enabled) return;
  if (!config.endpoint || !config.token) {
    throw new Error("Production push provider requires endpoint and token secrets");
  }
  if (!/^https:\/\//i.test(config.endpoint)) {
    throw new Error("Production push provider endpoint must use HTTPS");
  }
  if (!Number.isFinite(config.timeoutMs ?? 5000) || (config.timeoutMs ?? 5000) <= 0) {
    throw new Error("Production push provider timeout must be positive");
  }
  if (!Number.isInteger(config.maxRetries ?? 2) || (config.maxRetries ?? 2) < 0) {
    throw new Error("Production push provider maxRetries must be a non-negative integer");
  }
}

/**
 * Production adapter kept dormant until an approved provider and credentials
 * are configured. It never logs the bearer token or response body.
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
    if (!this.config.endpoint || !this.config.token) {
      throw new Error("Production push provider is not configured");
    }

    const now = Date.now();
    const lastSentAt = this.recent.get(alert.incidentId);
    if (lastSentAt !== undefined && now - lastSentAt < this.rateLimitMs) return;
    this.recent.set(alert.incidentId, now);

    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await fetch(this.config.endpoint, {
          method: "POST",
          headers: {
            authorization: `Bearer ${this.config.token}`,
            "content-type": "application/json",
          },
          body: JSON.stringify(alert),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Push provider returned HTTP ${response.status}`);
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
