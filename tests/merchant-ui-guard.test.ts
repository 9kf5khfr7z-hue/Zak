import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = path.resolve(__dirname, "..");
const appRoot = path.join(projectRoot, "app");
const componentsRoot = path.join(projectRoot, "components");

function collectSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return /\.(tsx|ts|jsx|js)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("Architecture guard: Merchant is backend-only in Phase 2", () => {
  it("does not contain the removed Merchant route or directory", () => {
    expect(existsSync(path.join(appRoot, "merchant"))).toBe(false);
    expect(existsSync(path.join(appRoot, "merchant", "index.tsx"))).toBe(false);
  });

  it("does not contain a Merchant UI route or component", () => {
    const uiFiles = [...collectSourceFiles(appRoot), ...collectSourceFiles(componentsRoot)];
    const merchantUiReferences = uiFiles.flatMap((filePath) => {
      const content = readFileSync(filePath, "utf8");
      return /merchant/i.test(content) ? [path.relative(projectRoot, filePath)] : [];
    });

    expect(merchantUiReferences).toEqual([]);
  });

  it("does not contain a Merchant route directory anywhere under the app", () => {
    const appDirectories = collectDirectories(appRoot);
    expect(appDirectories).not.toContain(path.join(appRoot, "merchant"));
  });
});

function collectDirectories(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (!entry.isDirectory()) return [];
    const entryPath = path.join(directory, entry.name);
    return [entryPath, ...collectDirectories(entryPath)];
  });
}

void statSync;
