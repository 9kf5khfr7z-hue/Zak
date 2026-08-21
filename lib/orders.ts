import AsyncStorage from "@react-native-async-storage/async-storage";

export type OrderStatus = "preparing" | "on_the_way" | "delivered";
export type AssignmentStatus = "unassigned" | "offered" | "accepted" | "rejected";

export type DriverAssignment = {
  driverId: string;
  status: AssignmentStatus;
  offeredAt: string;
  respondedAt: string | null;
};

export type OrderCoordinates = { latitude: number; longitude: number };

export type OrderTracking = {
  driverCoordinates: OrderCoordinates;
  destinationCoordinates: OrderCoordinates;
  etaMinutes: number;
  updatedAt: string;
};

export type OrderTimeline = {
  restaurantReceivedAt: string;
  preparingAt: string;
  driverPickedUpAt: string | null;
  deliveredAt: string | null;
};

export type OrderMessage = {
  id: string;
  sender: "customer" | "driver";
  text: string;
  createdAt: string;
};

export type Order = {
  id: string;
  orderNumber: string;
  storeName: string;
  total: number;
  deliveryFee: number;
  payment: "cash" | "card";
  note: string;
  address: string;
  status: OrderStatus;
  createdAt: string;
  driverName: string;
  driverPhone: string;
  messages: OrderMessage[];
  tracking: OrderTracking;
  timeline: OrderTimeline;
  items?: { name: string; quantity: number; price: number }[];
  storeId?: string;
  assignment?: DriverAssignment;
};

const ORDERS_KEY = "zak_orders_v1";
const DRIVER_ACTIVE_ORDER_KEY = "zak_driver_active_order_v1";

async function saveOrders(orders: Order[]) {
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  return orders;
}

function normalizeOrder(order: Order): Order {
  const createdAt = order.createdAt ?? new Date().toISOString();
  return {
    ...order,
    tracking: order.tracking ?? {
      driverCoordinates: { latitude: 32.8952, longitude: 13.1819 },
      destinationCoordinates: { latitude: 32.8872, longitude: 13.1913 },
      etaMinutes: 18,
      updatedAt: createdAt,
    },
    timeline: order.timeline ?? {
      restaurantReceivedAt: createdAt,
      preparingAt: createdAt,
      driverPickedUpAt: order.status === "on_the_way" || order.status === "delivered" ? createdAt : null,
      deliveredAt: order.status === "delivered" ? createdAt : null,
    },
  };
}

export async function getOrders(): Promise<Order[]> {
  try {
    const raw = await AsyncStorage.getItem(ORDERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Order[]).map(normalizeOrder) : [];
  } catch {
    return [];
  }
}

function createOrderNumber() {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `ZAK-${datePart}-${suffix}`;
}

export async function createOrder(input: Pick<Order, "total" | "payment" | "note" | "address"> & Partial<Pick<Order, "items" | "storeId" | "storeName">>) {
  const now = new Date().toISOString();
  const order: Order = {
    id: `order-${Date.now()}`,
    orderNumber: createOrderNumber(),
    storeName: input.storeName ?? "مذاق المدينة",
    total: input.total,
    deliveryFee: 4,
    payment: input.payment,
    note: input.note,
    address: input.address,
    status: "preparing",
    createdAt: now,
    driverName: "السائق المناوب",
    driverPhone: "091 000 0000",
    messages: [
      { id: `message-${Date.now()}`, sender: "driver", text: "مرحباً، سأتابع طلبك وأتواصل معك عند التحرك.", createdAt: now },
    ],
    tracking: {
      driverCoordinates: { latitude: 32.8952, longitude: 13.1819 },
      destinationCoordinates: { latitude: 32.8872, longitude: 13.1913 },
      etaMinutes: 18,
      updatedAt: now,
    },
    timeline: {
      restaurantReceivedAt: now,
      preparingAt: now,
      driverPickedUpAt: null,
      deliveredAt: null,
    },
    items: input.items,
    storeId: input.storeId,
  };
  const orders = await getOrders();
  await saveOrders([order, ...orders]);
  return order;
}

export async function reorderOrder(orderId: string) {
  const previous = await getOrder(orderId);
  if (!previous) return null;
  return createOrder({
    total: previous.total,
    payment: previous.payment,
    note: previous.note,
    address: previous.address,
    items: previous.items,
    storeId: previous.storeId,
    storeName: previous.storeName,
  });
}

export async function getOrder(id: string) {
  const orders = await getOrders();
  return orders.find((order) => order.id === id) ?? null;
}

export function canDriverTakeOrder(order: Order, activeOrderId?: string | null) {
  if (order.status === "delivered") return false;
  if (activeOrderId && activeOrderId !== order.id) return false;
  return order.assignment?.status !== "accepted";
}

export async function getDriverActiveOrderId() {
  return AsyncStorage.getItem(DRIVER_ACTIVE_ORDER_KEY);
}

export async function getNearbyDriverOrders(driverId: string, activeOrderId?: string | null) {
  const orders = await getOrders();
  return orders.filter((order) => {
    const isOpen = order.status === "preparing" && (!order.assignment || order.assignment.status === "unassigned" || order.assignment.status === "offered");
    return isOpen && canDriverTakeOrder(order, activeOrderId) && order.assignment?.driverId !== driverId;
  });
}

export async function offerOrderToDriver(orderId: string, driverId: string) {
  const orders = await getOrders();
  const now = new Date().toISOString();
  const next = orders.map((order) => order.id === orderId && (!order.assignment || order.assignment.status === "unassigned")
    ? { ...order, assignment: { driverId, status: "offered" as const, offeredAt: now, respondedAt: null } }
    : order);
  await saveOrders(next);
  return next.find((order) => order.id === orderId) ?? null;
}

export async function acceptDriverOrder(orderId: string, driverId: string) {
  const activeOrderId = await getDriverActiveOrderId();
  const orders = await getOrders();
  const target = orders.find((order) => order.id === orderId);
  if (!target || !canDriverTakeOrder(target, activeOrderId) || (target.assignment && target.assignment.driverId !== driverId && target.assignment.status !== "unassigned")) return null;
  const now = new Date().toISOString();
  const next = orders.map((order) => order.id === orderId
    ? { ...order, assignment: { driverId, status: "accepted" as const, offeredAt: order.assignment?.offeredAt ?? now, respondedAt: now }, driverName: order.driverName === "السائق المناوب" ? `مندوب ${driverId}` : order.driverName }
    : order);
  await saveOrders(next);
  await AsyncStorage.setItem(DRIVER_ACTIVE_ORDER_KEY, orderId);
  return next.find((order) => order.id === orderId) ?? null;
}

export async function rejectDriverOrder(orderId: string, driverId: string) {
  const orders = await getOrders();
  const target = orders.find((order) => order.id === orderId);
  if (!target || (target.assignment && target.assignment.driverId !== driverId)) return null;
  const now = new Date().toISOString();
  const next = orders.map((order) => order.id === orderId
    ? { ...order, assignment: { driverId, status: "rejected" as const, offeredAt: order.assignment?.offeredAt ?? now, respondedAt: now } }
    : order);
  await saveOrders(next);
  return next.find((order) => order.id === orderId) ?? null;
}

export async function clearDriverActiveOrder(orderId: string) {
  const activeOrderId = await getDriverActiveOrderId();
  if (activeOrderId === orderId) await AsyncStorage.removeItem(DRIVER_ACTIVE_ORDER_KEY);
}

export async function addOrderMessage(orderId: string, sender: OrderMessage["sender"], text: string) {
  const trimmed = text.trim();
  if (!trimmed) return getOrder(orderId);
  const orders = await getOrders();
  const next = orders.map((order) => order.id === orderId ? {
    ...order,
    messages: [...order.messages, { id: `message-${Date.now()}`, sender, text: trimmed, createdAt: new Date().toISOString() }],
  } : order);
  await saveOrders(next);
  return next.find((order) => order.id === orderId) ?? null;
}

export function getTrackingLabel(status: OrderStatus) {
  if (status === "on_the_way") return "السائق في الطريق إليك";
  if (status === "delivered") return "وصلت الطلبية";
  return "المتجر يجهّز طلبك";
}

export function getEtaLabel(order: Order) {
  if (order.status === "delivered") return "تم الوصول";
  if (order.status === "preparing") return "يبدأ التوصيل بعد تجهيز الطلب";
  return `${order.tracking.etaMinutes} دقيقة تقريباً`;
}

export function getStatusLabel(status: OrderStatus) {
  if (status === "on_the_way") return "في الطريق";
  if (status === "delivered") return "تم التوصيل";
  return "قيد التحضير";
}
