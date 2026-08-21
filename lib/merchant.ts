import AsyncStorage from "@react-native-async-storage/async-storage";

export type MerchantProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  active: boolean;
};

export type MerchantOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  total: number;
  status: "new" | "accepted" | "preparing" | "ready";
  createdAt: string;
};

const PRODUCTS_KEY = "zak_merchant_products_v1";
const ORDERS_KEY = "zak_merchant_orders_v1";

const defaultProducts: MerchantProduct[] = [
  { id: "burger", name: "برجر زاك الخاص", category: "وجبات", price: 24, stock: 18, active: true },
  { id: "family", name: "وجبة عائلية", category: "وجبات", price: 58, stock: 9, active: true },
  { id: "drink", name: "مشروب بارد", category: "مشروبات", price: 6, stock: 42, active: true },
];

const defaultOrders: MerchantOrder[] = [
  { id: "merchant-order-1", orderNumber: "ZAK-260821-1024", customerName: "عميل زاك", total: 86, status: "new", createdAt: new Date().toISOString() },
  { id: "merchant-order-2", orderNumber: "ZAK-260821-1007", customerName: "محمد سالم", total: 42, status: "preparing", createdAt: new Date(Date.now() - 18 * 60_000).toISOString() },
];

async function read<T>(key: string, fallback: T) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

export async function getMerchantProducts() {
  return read(PRODUCTS_KEY, defaultProducts);
}

export async function saveMerchantProducts(products: MerchantProduct[]) {
  await AsyncStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  return products;
}

export async function getMerchantOrders() {
  return read(ORDERS_KEY, defaultOrders);
}

export async function updateMerchantOrderStatus(id: string, status: MerchantOrder["status"]) {
  const orders = await getMerchantOrders();
  const next = orders.map((order) => (order.id === id ? { ...order, status } : order));
  await AsyncStorage.setItem(ORDERS_KEY, JSON.stringify(next));
  return next;
}
