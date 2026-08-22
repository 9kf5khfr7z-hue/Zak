import { beforeEach, describe, expect, it } from "vitest";
import { addMockLedgerEntry, calculateMockBalance, getMockWallet, resetMockWallet } from "../lib/providers/mock/wallet-mock";

beforeEach(async () => {
  await resetMockWallet();
});

describe("wallet-mock.test.ts", () => {
  it("starts with zero balance", async () => {
    const wallet = await getMockWallet("customer-a");
    expect(wallet.balance).toBe(0);
    expect(wallet.ledger).toHaveLength(0);
  });

  it("applies TOPUP and ORDER_PAYMENT through the ledger", async () => {
    await addMockLedgerEntry("TOPUP", 100, "topup-1", { walletId: "customer-a", idempotencyKey: "topup-1" });
    await addMockLedgerEntry("ORDER_PAYMENT", 35, "order-1", { walletId: "customer-a", idempotencyKey: "payment-1" });
    expect((await getMockWallet("customer-a")).balance).toBe(65);
    expect(calculateMockBalance((await getMockWallet("customer-a")).ledger)).toBe(65);
  });

  it("prevents duplicate ledger entries with the same idempotency key", async () => {
    const first = await addMockLedgerEntry("TOPUP", 50, "topup-duplicate", { walletId: "customer-a", idempotencyKey: "same-key" });
    const second = await addMockLedgerEntry("TOPUP", 50, "topup-duplicate", { walletId: "customer-a", idempotencyKey: "same-key" });
    const wallet = await getMockWallet("customer-a");
    expect(second.id).toBe(first.id);
    expect(wallet.ledger).toHaveLength(1);
    expect(wallet.balance).toBe(50);
  });

  it("isolates wallets from each other", async () => {
    await addMockLedgerEntry("TOPUP", 80, "topup-a", { walletId: "customer-a", idempotencyKey: "a-1" });
    await addMockLedgerEntry("TOPUP", 25, "topup-b", { walletId: "customer-b", idempotencyKey: "b-1" });
    expect((await getMockWallet("customer-a")).balance).toBe(80);
    expect((await getMockWallet("customer-b")).balance).toBe(25);
  });
});
