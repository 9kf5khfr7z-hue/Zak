import AsyncStorage from "@react-native-async-storage/async-storage";

export type MockLedgerKind = "TOPUP" | "ORDER_PAYMENT" | "REFUND";
export type MockLedgerEntry = { id: string; kind: MockLedgerKind; amount: number; reference: string; createdAt: string };

const LEDGER_KEY = "zak_demo_wallet_ledger_v1";

export async function getMockLedger(): Promise<MockLedgerEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(LEDGER_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function calculateMockBalance(entries: MockLedgerEntry[]): number {
  return entries.reduce((balance, entry) => balance + (entry.kind === "ORDER_PAYMENT" ? -entry.amount : entry.amount), 0);
}

export async function addMockLedgerEntry(kind: MockLedgerKind, amount: number, reference: string) {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("Ledger amount must be positive");
  const entry: MockLedgerEntry = { id: `ledger-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, kind, amount, reference, createdAt: new Date().toISOString() };
  const next = [entry, ...(await getMockLedger())];
  await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(next));
  return entry;
}

export async function getMockWallet() {
  const ledger = await getMockLedger();
  return { balance: calculateMockBalance(ledger), ledger };
}

export async function resetMockWallet() {
  await AsyncStorage.removeItem(LEDGER_KEY);
}
