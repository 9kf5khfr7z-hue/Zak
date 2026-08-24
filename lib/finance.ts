import AsyncStorage from "@react-native-async-storage/async-storage";

export type CustodyDirection = "company_due" | "driver_due";
export type CustodyEntry = {
  id: string;
  driverId: string;
  driverName: string;
  orderId: string;
  orderNumber: string;
  amount: number | null;
  direction: CustodyDirection;
  type: "delivery_due" | "collected" | "settled" | "cancellation_fee";
  reason: string;
  createdAt: string;
  status: "pending" | "approved" | "settled";
};
export type CancellationRecord = {
  id: string;
  orderId: string;
  orderNumber: string;
  cancelledBy: "customer" | "driver" | "store" | "admin";
  reason: string;
  deliveryFeeDue: number | null;
  responsibleParty: "customer" | "store" | "platform" | "none";
  reviewStatus: "pending_company_review" | "resolved";
  createdAt: string;
};

const CUSTODY_KEY = "zak_driver_custody_v1";
const CANCELLATION_KEY = "zak_cancellations_v1";
export const DEFAULT_CUSTODY_LIMIT = 100;

export function getCustodyExposure(entries: CustodyEntry[]) {
  return entries
    .filter((entry) => (entry.direction ?? "company_due") === "company_due" && entry.status !== "settled")
    .reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
}

export function getCustodyAlert(entries: CustodyEntry[], limit = DEFAULT_CUSTODY_LIMIT) {
  const exposure = getCustodyExposure(entries);
  return { exposure, limit, exceeded: exposure > limit, overage: Math.max(0, exposure - limit) };
}

export function getDriversOverLimit(entries: CustodyEntry[], limit = DEFAULT_CUSTODY_LIMIT) {
  const grouped = entries.reduce<Record<string, CustodyEntry[]>>((result, entry) => {
    result[entry.driverId] = [...(result[entry.driverId] ?? []), entry];
    return result;
  }, {});
  return Object.values(grouped)
    .map((driverEntries) => ({ driverId: driverEntries[0].driverId, driverName: driverEntries[0].driverName, ...getCustodyAlert(driverEntries, limit) }))
    .filter((driver) => driver.exceeded);
}

export async function getCustodyEntries() {
  try {
    const raw = await AsyncStorage.getItem(CUSTODY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CustodyEntry[]) : [];
  } catch {
    return [];
  }
}

export async function getCancellationRecords() {
  try {
    const raw = await AsyncStorage.getItem(CANCELLATION_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as CancellationRecord[]) : [];
  } catch {
    return [];
  }
}

export async function recordCancellation(input: Omit<CancellationRecord, "id" | "createdAt" | "reviewStatus"> & { reviewStatus?: CancellationRecord["reviewStatus"] }) {
  const records = await getCancellationRecords();
  const existing = records.find((record) => record.orderId === input.orderId && record.reason === input.reason);
  if (existing) return existing;
  const record: CancellationRecord = {
    ...input,
    reviewStatus: input.reviewStatus ?? "resolved",
    id: `cancel-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CANCELLATION_KEY, JSON.stringify([record, ...records]));
  return record;
}

export async function recordDeliveryDue(input: Pick<CustodyEntry, "driverId" | "driverName" | "orderId" | "orderNumber" | "amount" | "reason"> & { direction?: CustodyDirection; type?: CustodyEntry["type"] }) {
  const entries = await getCustodyEntries();
  const existing = entries.find((entry) => entry.orderId === input.orderId && entry.type === (input.type ?? "delivery_due") && entry.reason === input.reason);
  if (existing) return existing;
  const entry: CustodyEntry = {
    ...input,
    direction: input.direction ?? "company_due",
    id: `custody-${Date.now()}`,
    type: input.type ?? "delivery_due",
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(CUSTODY_KEY, JSON.stringify([entry, ...entries]));
  return entry;
}

export async function recordCustomerRefusalReview(input: { orderId: string; orderNumber: string; driverId: string; driverName: string }) {
  const reason = "الزبون رفض الاستلام عند الوصول";
  const cancellation = await recordCancellation({
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    cancelledBy: "customer",
    reason,
    deliveryFeeDue: null,
    responsibleParty: "customer",
    reviewStatus: "pending_company_review",
  });
  const custody = await recordDeliveryDue({
    driverId: input.driverId,
    driverName: input.driverName,
    orderId: input.orderId,
    orderNumber: input.orderNumber,
    amount: null,
    direction: "driver_due",
    type: "cancellation_fee",
    reason: "حق توصيل قيد تحديد الشركة بسبب رفض الزبون للاستلام",
  });
  return { cancellation, custody };
}

export function getCustodyTypeLabel(type: CustodyEntry["type"]) {
  if (type === "cancellation_fee") return "حق توصيل من إلغاء";
  if (type === "collected") return "مبلغ محصل";
  if (type === "settled") return "تمت التسوية";
  return "عهدة توصيل";
}

export function getCustodyDirectionLabel(direction: CustodyDirection) {
  return direction === "company_due" ? "مستحق للشركة من السائق" : "مستحق للسائق من الشركة";
}

export function getResponsibleLabel(value: CancellationRecord["responsibleParty"]) {
  if (value === "customer") return "الزبون";
  if (value === "store") return "المتجر";
  if (value === "platform") return "المنصة";
  return "لا يوجد";
}
