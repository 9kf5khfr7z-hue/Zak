export type ZakRole = "customer" | "driver" | "merchant" | "admin" | "super_admin";

export type ZakPermission =
  | "orders:create"
  | "orders:read_own"
  | "orders:read_assigned"
  | "orders:update_delivery"
  | "orders:update_merchant"
  | "orders:cancel"
  | "drivers:manage"
  | "merchants:manage_own"
  | "admin:operate"
  | "wallet:read_own"
  | "support:create"
  | "support:manage";

const rolePermissions: Record<ZakRole, readonly ZakPermission[]> = {
  customer: ["orders:create", "orders:read_own", "orders:cancel", "wallet:read_own", "support:create"],
  driver: ["orders:read_assigned", "orders:update_delivery", "orders:cancel", "wallet:read_own", "support:create"],
  merchant: ["orders:read_assigned", "orders:update_merchant", "support:create"],
  admin: ["drivers:manage", "merchants:manage_own", "admin:operate", "support:manage"],
  super_admin: [
    "drivers:manage",
    "merchants:manage_own",
    "admin:operate",
    "support:manage",
  ],
};

export function hasPermission(role: ZakRole, permission: ZakPermission): boolean {
  return rolePermissions[role].includes(permission);
}

export function assertPermission(role: ZakRole, permission: ZakPermission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`FORBIDDEN: ${permission}`);
  }
}

export function getPermissions(role: ZakRole): readonly ZakPermission[] {
  return rolePermissions[role];
}
