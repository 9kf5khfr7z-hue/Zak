export type OrderStatus =
  | "PENDING"
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ACCEPTED"
  | "DRIVER_ARRIVED"
  | "PICKED_UP"
  | "IN_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "FAILED";

export type OrderActor = "customer" | "driver" | "merchant" | "admin";

const transitions: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["SEARCHING_DRIVER", "CANCELLED", "FAILED"],
  SEARCHING_DRIVER: ["DRIVER_ASSIGNED", "CANCELLED", "FAILED"],
  DRIVER_ASSIGNED: ["DRIVER_ACCEPTED", "CANCELLED", "FAILED"],
  DRIVER_ACCEPTED: ["DRIVER_ARRIVED", "CANCELLED", "FAILED"],
  DRIVER_ARRIVED: ["PICKED_UP", "CANCELLED", "FAILED"],
  PICKED_UP: ["IN_DELIVERY", "FAILED"],
  IN_DELIVERY: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  CANCELLED: [],
  FAILED: [],
};

const allowedActors: Record<string, readonly OrderActor[]> = {
  "PENDING:SEARCHING_DRIVER": ["admin"],
  "PENDING:CANCELLED": ["customer", "admin"],
  "PENDING:FAILED": ["admin"],
  "SEARCHING_DRIVER:DRIVER_ASSIGNED": ["admin"],
  "SEARCHING_DRIVER:CANCELLED": ["customer", "admin"],
  "SEARCHING_DRIVER:FAILED": ["admin"],
  "DRIVER_ASSIGNED:DRIVER_ACCEPTED": ["driver"],
  "DRIVER_ASSIGNED:CANCELLED": ["customer", "driver", "admin"],
  "DRIVER_ASSIGNED:FAILED": ["admin"],
  "DRIVER_ACCEPTED:DRIVER_ARRIVED": ["driver"],
  "DRIVER_ACCEPTED:CANCELLED": ["customer", "driver", "admin"],
  "DRIVER_ACCEPTED:FAILED": ["admin"],
  "DRIVER_ARRIVED:PICKED_UP": ["driver"],
  "DRIVER_ARRIVED:CANCELLED": ["customer", "driver", "admin"],
  "DRIVER_ARRIVED:FAILED": ["admin"],
  "PICKED_UP:IN_DELIVERY": ["driver"],
  "PICKED_UP:FAILED": ["admin"],
  "IN_DELIVERY:DELIVERED": ["driver"],
  "IN_DELIVERY:FAILED": ["admin"],
};

export function canTransition(
  from: OrderStatus,
  to: OrderStatus,
  actor: OrderActor,
): boolean {
  return transitions[from].includes(to) && allowedActors[`${from}:${to}`]?.includes(actor) === true;
}

export function getAllowedTransitions(status: OrderStatus): readonly OrderStatus[] {
  return transitions[status];
}

export type LegacyOrderStatus = "preparing" | "on_the_way" | "delivered";

/** Maps the current local/server status model to the canonical ZAK workflow. */
export function toCanonicalStatus(status: LegacyOrderStatus): OrderStatus {
  if (status === "delivered") return "DELIVERED";
  if (status === "on_the_way") return "IN_DELIVERY";
  return "DRIVER_ASSIGNED";
}

/** Maps canonical statuses back to the legacy client status used by stored orders. */
export function fromCanonicalStatus(status: OrderStatus): LegacyOrderStatus {
  if (status === "DELIVERED") return "delivered";
  if (["PICKED_UP", "IN_DELIVERY"].includes(status)) return "on_the_way";
  return "preparing";
}

export const orderStatusLabels = {
  ar: {
    PENDING: "قيد الإنشاء",
    SEARCHING_DRIVER: "جاري البحث عن مندوب",
    DRIVER_ASSIGNED: "تم تعيين المندوب",
    DRIVER_ACCEPTED: "قبل المندوب الطلب",
    DRIVER_ARRIVED: "وصل المندوب",
    PICKED_UP: "تم الاستلام",
    IN_DELIVERY: "في الطريق",
    DELIVERED: "تم التسليم",
    CANCELLED: "ملغى",
    FAILED: "تعذر تنفيذ الطلب",
  },
  en: {
    PENDING: "Pending",
    SEARCHING_DRIVER: "Searching for a driver",
    DRIVER_ASSIGNED: "Driver assigned",
    DRIVER_ACCEPTED: "Driver accepted",
    DRIVER_ARRIVED: "Driver arrived",
    PICKED_UP: "Picked up",
    IN_DELIVERY: "On the way",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
    FAILED: "Failed",
  },
} satisfies Record<"ar" | "en", Record<OrderStatus, string>>;
