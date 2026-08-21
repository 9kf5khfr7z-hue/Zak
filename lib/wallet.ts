import AsyncStorage from "@react-native-async-storage/async-storage";

export type TopUpMethod = "electronic" | "bank_transfer";
export type TopUpStatus = "pending" | "approved" | "rejected";

export type WalletTransaction = {
  id: string;
  type: "top_up" | "payment";
  amount: number;
  title: string;
  method?: TopUpMethod;
  status: TopUpStatus;
  createdAt: string;
};

const WALLET_KEY = "zak_wallet_v1";

export type WalletState = { balance: number; transactions: WalletTransaction[] };
const initialState: WalletState = { balance: 0, transactions: [] };

export async function getWallet(): Promise<WalletState> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_KEY);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as WalletState;
    return { balance: Number(parsed.balance ?? 0), transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [] };
  } catch { return initialState; }
}

export async function requestTopUp(amount: number, method: TopUpMethod) {
  const wallet = await getWallet();
  const transaction: WalletTransaction = { id: `topup-${Date.now()}`, type: "top_up", amount, title: method === "electronic" ? "طلب شحن إلكتروني" : "طلب تحويل مصرفي", method, status: "pending", createdAt: new Date().toISOString() };
  const next = { ...wallet, transactions: [transaction, ...wallet.transactions] };
  await AsyncStorage.setItem(WALLET_KEY, JSON.stringify(next));
  return transaction;
}

export function getTopUpStatusLabel(status: TopUpStatus) {
  if (status === "approved") return "تمت الموافقة";
  if (status === "rejected") return "مرفوض";
  return "قيد المراجعة";
}
