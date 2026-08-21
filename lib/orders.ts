import AsyncStorage from "@react-native-async-storage/async-storage";

export type OrderStatus = "preparing" | "on_the_way" | "delivered";

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
};

const ORDERS_KEY = "zak_orders_v1";

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

export async function createOrder(input: Pick<Order, "total" | "payment" | "note" | "address">) {
  const now = new Date().toISOString();
  const order: Order = {
    id: `order-${Date.now()}`,
    orderNumber: createOrderNumber(),
    storeName: "مذاق المدينة",
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
  };
  const orders = await getOrders();
  await saveOrders([order, ...orders]);
  return order;
}

export async function getOrder(id: string) {
  const orders = await getOrders();
  return orders.find((order) => order.id === id) ?? null;
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
