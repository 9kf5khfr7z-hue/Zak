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
