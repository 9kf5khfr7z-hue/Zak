import AsyncStorage from "@react-native-async-storage/async-storage";
import { assertTransition, type OrderActor, type OrderStatus } from "../shared/order-state";

export type DemoOrderHistory = { status: OrderStatus; actor: OrderActor; at: string };
export type DemoOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  storeName: string;
  address: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  payment: "cash" | "card" | "wallet";
  status: OrderStatus;
  driverId: string | null;
  driverName: string | null;
  createdAt: string;
  updatedAt: string;
  history: DemoOrderHistory[];
};

const ORDERS_KEY = "zak_demo_orders_v1";
const ACTIVE_DRIVER_KEY = "zak_demo_active_driver_v1";
const DEMO_DRIVER_ID = "driver-demo-001";
let memoryStore: Record<string, string> = {};

async function readValue(key: string) {
  try { return await AsyncStorage.getItem(key); } catch { return memoryStore[key] ?? null; }
}

async function writeValue(key: string, value: string) {
  try { await AsyncStorage.setItem(key, value); } catch { memoryStore[key] = value; }
}

async function removeValue(key: string) {
  try { await AsyncStorage.removeItem(key); } catch { delete memoryStore[key]; }
}

async function saveOrders(orders: DemoOrder[]) {
  await writeValue(ORDERS_KEY, JSON.stringify(orders));
}

export async function getDemoOrders(): Promise<DemoOrder[]> {
  try {
    const raw = await readValue(ORDERS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getDemoOrder(id: string): Promise<DemoOrder | null> {
  return (await getDemoOrders()).find((order) => order.id === id || order.orderNumber === id) ?? null;
}

export async function createDemoOrder(input?: Partial<Pick<DemoOrder, "customerName" | "address" | "items" | "total" | "payment">>) {
  const now = new Date().toISOString();
  const id = `demo-order-${Date.now()}`;
  const order: DemoOrder = {
    id,
    orderNumber: `ZAK-D${String(Date.now()).slice(-6)}`,
    customerName: input?.customerName ?? "زبون التجربة",
    storeName: "مطعم زاك التجريبي",
    address: input?.address ?? "طرابلس · عنوان تجريبي",
    items: input?.items ?? [{ name: "وجبة زاك التجريبية", quantity: 1, price: 25 }],
    total: input?.total ?? 30,
    payment: input?.payment ?? "cash",
    status: "PENDING",
    driverId: null,
    driverName: null,
    createdAt: now,
    updatedAt: now,
    history: [{ status: "PENDING", actor: "customer", at: now }],
  };
  await saveOrders([order, ...(await getDemoOrders())]);
  return order;
}

export async function transitionDemoOrder(id: string, to: OrderStatus, actor: OrderActor, driverId = DEMO_DRIVER_ID) {
  const orders = await getDemoOrders();
  const current = orders.find((order) => order.id === id || order.orderNumber === id);
  if (!current) throw new Error("Demo order not found");
  assertTransition(current.status, to, actor);
  if (to === "DRIVER_ACCEPTED" && current.driverId !== driverId) throw new Error("Only the assigned driver can accept this order");
  if (to === "DRIVER_ASSIGNED") current.driverId = driverId;
  if (to === "DRIVER_ACCEPTED") current.driverName = "سائق زاك التجريبي";
  const now = new Date().toISOString();
  const updated: DemoOrder = { ...current, status: to, updatedAt: now, history: [...current.history, { status: to, actor, at: now }] };
  await saveOrders(orders.map((order) => (order.id === current.id ? updated : order)));
  return updated;
}

export async function startDemoDispatch(id: string) {
  let order = await transitionDemoOrder(id, "SEARCHING_DRIVER", "system");
  order = await transitionDemoOrder(order.id, "DRIVER_ASSIGNED", "system");
  return order;
}

export async function getDemoActiveDriverOrder(): Promise<DemoOrder | null> {
  const orders = await getDemoOrders();
  return orders.find((order) => order.driverId === DEMO_DRIVER_ID && ["DRIVER_ASSIGNED", "DRIVER_ACCEPTED", "DRIVER_ARRIVED", "PICKED_UP", "IN_DELIVERY"].includes(order.status)) ?? null;
}

export async function resetDemoOrders() {
  await removeValue(ORDERS_KEY);
  await removeValue(ACTIVE_DRIVER_KEY);
  memoryStore = {};
}

export { DEMO_DRIVER_ID };
