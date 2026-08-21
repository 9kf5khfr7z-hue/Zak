import AsyncStorage from "@react-native-async-storage/async-storage";

export type CustodyDirection = "company_due" | "driver_due";
export type CustodyEntry = { id: string; driverId: string; driverName: string; orderId: string; orderNumber: string; amount: number; direction: CustodyDirection; type: "delivery_due" | "collected" | "settled" | "cancellation_fee"; reason: string; createdAt: string; status: "pending" | "approved" | "settled" };
export type CancellationRecord = { id: string; orderId: string; orderNumber: string; cancelledBy: "customer" | "driver" | "store" | "admin"; reason: string; deliveryFeeDue: number; responsibleParty: "customer" | "store" | "platform" | "none"; createdAt: string };

const CUSTODY_KEY = "zak_driver_custody_v1";
export const DEFAULT_CUSTODY_LIMIT = 100;
export function getCustodyExposure(entries: CustodyEntry[]) { return entries.filter((entry) => (entry.direction ?? "company_due") === "company_due" && entry.status !== "settled").reduce((sum, entry) => sum + entry.amount, 0); }
export function getCustodyAlert(entries: CustodyEntry[], limit = DEFAULT_CUSTODY_LIMIT) { const exposure = getCustodyExposure(entries); return { exposure, limit, exceeded: exposure > limit, overage: Math.max(0, exposure - limit) }; }
export function getDriversOverLimit(entries: CustodyEntry[], limit = DEFAULT_CUSTODY_LIMIT) { const grouped = entries.reduce<Record<string, CustodyEntry[]>>((result, entry) => { result[entry.driverId] = [...(result[entry.driverId] ?? []), entry]; return result; }, {}); return Object.values(grouped).map((driverEntries) => ({ driverId: driverEntries[0].driverId, driverName: driverEntries[0].driverName, ...getCustodyAlert(driverEntries, limit) })).filter((driver) => driver.exceeded); }
const CANCELLATION_KEY = "zak_cancellations_v1";

export async function getCustodyEntries() { try { const raw = await AsyncStorage.getItem(CUSTODY_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed as CustodyEntry[] : []; } catch { return []; } }
export async function getCancellationRecords() { try { const raw = await AsyncStorage.getItem(CANCELLATION_KEY); const parsed = raw ? JSON.parse(raw) : []; return Array.isArray(parsed) ? parsed as CancellationRecord[] : []; } catch { return []; } }

export async function recordCancellation(input: Omit<CancellationRecord, "id" | "createdAt">) { const record: CancellationRecord = { ...input, id: `cancel-${Date.now()}`, createdAt: new Date().toISOString() }; const records = await getCancellationRecords(); await AsyncStorage.setItem(CANCELLATION_KEY, JSON.stringify([record, ...records])); return record; }
export async function recordDeliveryDue(input: Pick<CustodyEntry, "driverId" | "driverName" | "orderId" | "orderNumber" | "amount" | "reason"> & { direction?: CustodyDirection }) { const entry: CustodyEntry = { ...input, direction: input.direction ?? "company_due", id: `custody-${Date.now()}`, type: "delivery_due", status: "pending", createdAt: new Date().toISOString() }; const entries = await getCustodyEntries(); await AsyncStorage.setItem(CUSTODY_KEY, JSON.stringify([entry, ...entries])); return entry; }
export function getCustodyTypeLabel(type: CustodyEntry["type"]) { if (type === "cancellation_fee") return "حق توصيل من إلغاء"; if (type === "collected") return "مبلغ محصل"; if (type === "settled") return "تمت التسوية"; return "عهدة توصيل"; }
export function getCustodyDirectionLabel(direction: CustodyDirection) { return direction === "company_due" ? "مستحق للشركة من السائق" : "مستحق للسائق من الشركة"; }
export function getResponsibleLabel(value: CancellationRecord["responsibleParty"]) { if (value === "customer") return "الزبون"; if (value === "store") return "المتجر"; if (value === "platform") return "المنصة"; return "لا يوجد"; }
