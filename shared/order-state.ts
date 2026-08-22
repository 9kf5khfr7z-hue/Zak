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

export type OrderActor = "customer" | "driver" | "merchant" | "admin" | "system";

export type TransitionCondition =
  | "order_created"
  | "driver_search_started"
  | "driver_assigned"
  | "assigned_driver_only"
  | "driver_arrived"
  | "pickup_confirmed"
  | "delivery_started"
  | "delivery_confirmed"
  | "customer_or_operator_cancellation"
  | "operator_failure";

export type OrderTransition = {
  from: OrderStatus;
  to: OrderStatus;
  allowedActors: readonly OrderActor[];
  condition: TransitionCondition;
};

const transitionList: readonly OrderTransition[] = [
  { from: "PENDING", to: "SEARCHING_DRIVER", allowedActors: ["system", "admin"], condition: "driver_search_started" },
  { from: "SEARCHING_DRIVER", to: "DRIVER_ASSIGNED", allowedActors: ["system", "admin"], condition: "driver_assigned" },
  { from: "DRIVER_ASSIGNED", to: "DRIVER_ACCEPTED", allowedActors: ["driver"], condition: "assigned_driver_only" },
  { from: "DRIVER_ACCEPTED", to: "DRIVER_ARRIVED", allowedActors: ["driver"], condition: "driver_arrived" },
  // Phase 2 Option A: Demo-only simplification; the driver confirms pickup directly.
  { from: "DRIVER_ARRIVED", to: "PICKED_UP", allowedActors: ["driver"], condition: "pickup_confirmed" },
  { from: "PICKED_UP", to: "IN_DELIVERY", allowedActors: ["driver"], condition: "delivery_started" },
  { from: "IN_DELIVERY", to: "DELIVERED", allowedActors: ["driver", "customer"], condition: "delivery_confirmed" },
  { from: "PENDING", to: "CANCELLED", allowedActors: ["customer", "admin", "system"], condition: "customer_or_operator_cancellation" },
  { from: "SEARCHING_DRIVER", to: "CANCELLED", allowedActors: ["customer", "admin", "system"], condition: "customer_or_operator_cancellation" },
  { from: "DRIVER_ASSIGNED", to: "CANCELLED", allowedActors: ["customer", "driver", "admin"], condition: "customer_or_operator_cancellation" },
  { from: "DRIVER_ACCEPTED", to: "CANCELLED", allowedActors: ["customer", "driver", "admin"], condition: "customer_or_operator_cancellation" },
  { from: "DRIVER_ARRIVED", to: "CANCELLED", allowedActors: ["customer", "driver", "admin"], condition: "customer_or_operator_cancellation" },
  { from: "PENDING", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "SEARCHING_DRIVER", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "DRIVER_ASSIGNED", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "DRIVER_ACCEPTED", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "DRIVER_ARRIVED", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "PICKED_UP", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
  { from: "IN_DELIVERY", to: "FAILED", allowedActors: ["system", "admin"], condition: "operator_failure" },
];

const transitionMap = new Map(transitionList.map((rule) => [`${rule.from}:${rule.to}`, rule]));

export function getTransition(from: OrderStatus, to: OrderStatus): OrderTransition | null {
  return transitionMap.get(`${from}:${to}`) ?? null;
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): boolean {
  return getTransition(from, to)?.allowedActors.includes(actor) ?? false;
}

export function assertTransition(from: OrderStatus, to: OrderStatus, actor: OrderActor): OrderTransition {
  const rule = getTransition(from, to);
  if (!rule || !rule.allowedActors.includes(actor)) {
    throw new Error(`Illegal order transition: ${from} -> ${to} by ${actor}`);
  }
  return rule;
}

export function getAllowedTransitions(status: OrderStatus): readonly OrderStatus[] {
  return transitionList.filter((rule) => rule.from === status).map((rule) => rule.to);
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
