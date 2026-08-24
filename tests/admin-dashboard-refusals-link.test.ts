import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const dashboardPath = path.join(projectRoot, "app", "admin", "index.tsx");

const dashboardSource = readFileSync(dashboardPath, "utf8");

describe("Admin Dashboard customer refusals link", () => {
  it("exposes the customer-refusal monitoring entry in the follow-up centers", () => {
    expect(dashboardSource).toContain('label: "طلبات رفض الزبون"');
    expect(dashboardSource).toContain('route: "/admin/finance"');
    expect(dashboardSource).toContain("router.push(item.route)");
  });

  it("keeps the refusal entry accessible as a button", () => {
    expect(dashboardSource).toContain('accessibilityRole="button"');
    expect(dashboardSource).toContain("accessibilityLabel={`فتح ${item.label}`}");
  });
});
