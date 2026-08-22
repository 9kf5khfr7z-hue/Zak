import AsyncStorage from "@react-native-async-storage/async-storage";

export type MockLedgerKind = "TOPUP" | "ORDER_PAYMENT" | "REFUND";
export type MockLedgerEntry = {
  id: string;
  walletId: string;
  kind: MockLedgerKind;
  amount: number;
  reference: string;
  idempotencyKey?: string;
  createdAt: string;
};

const LEDGER_KEY = "zak_demo_wallet_ledger_v2";
const DEFAULT_WALLET_ID = "customer-demo-001";
let memoryLedger: MockLedgerEntry[] = [];

async function readLedger(): Promise<MockLedgerEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return memoryLedger;
  }
}

async function writeLedger(entries: MockLedgerEntry[]) {
  memoryLedger = entries;
  try { await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(entries)); } catch { /* test fallback */ }
}

export async function getMockLedger(walletId?: string): Promise<MockLedgerEntry[]> {
  const entries = await readLedger();
  return walletId ? entries.filter((entry) => entry.walletId === walletId) : entries;
}

export function calculateMockBalance(entries: MockLedgerEntry[]): number {
  return entries.reduce((balance, entry) => balance + (entry.kind === "ORDER_PAYMENT" ? -entry.amount : entry.amount), 0);
}

export async function addMockLedgerEntry(
  kind: MockLedgerKind,
  amount: number,
  reference: string,
  options: { walletId?: string; idempotencyKey?: string } = {},
) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Ledger amount must be positive");
  const walletId = options.walletId ?? DEFAULT_WALLET_ID;
  const allEntries = await readLedger();
  const duplicate = options.idempotencyKey
    ? allEntries.find((entry) => entry.walletId === walletId && entry.idempotencyKey === options.idempotencyKey)
    : undefined;
  if (duplicate) return duplicate;
  const entry: MockLedgerEntry = {
    id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    walletId,
    kind,
    amount,
    reference,
    ...(options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}),
    createdAt: new Date().toISOString(),
  };
  await writeLedger([entry, ...allEntries]);
  return entry;
}

export async function getMockWallet(walletId = DEFAULT_WALLET_ID) {
  const ledger = await getMockLedger(walletId);
  return { walletId, balance: calculateMockBalance(ledger), ledger };
}

export async function resetMockWallet() {
  memoryLedger = [];
  try { await AsyncStorage.removeItem(LEDGER_KEY); } catch { /* test fallback */ }
}

export { DEFAULT_WALLET_ID };
