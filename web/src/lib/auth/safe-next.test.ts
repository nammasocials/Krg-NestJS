import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-next";

describe("safeNext", () => {
  it("keeps same-site paths of known areas, with their query", () => {
    expect(safeNext("/invoice")).toBe("/invoice");
    expect(safeNext("/invoice/123?tab=items")).toBe("/invoice/123?tab=items");
    expect(safeNext("/dashboard")).toBe("/dashboard");
  });

  it("falls back to the dashboard for missing or odd values", () => {
    for (const v of [undefined, null, "", "invoice"]) {
      expect(safeNext(v)).toBe("/dashboard");
    }
  });

  it("uses the first value when the parameter is repeated", () => {
    expect(safeNext(["/report", "https://evil.example"])).toBe("/report");
  });

  it("rejects other sites and tricks", () => {
    for (const v of [
      "https://evil.example",
      "//evil.example",
      "///evil.example",
      "/\\evil.example",
      "/invoice\\..\\x",
      "javascript:alert(1)",
      "/invoice\n//evil.example",
      "http:/evil.example",
    ]) {
      expect(safeNext(v)).toBe("/dashboard");
    }
  });

  it("rejects unknown areas, the login page and look-alike prefixes", () => {
    for (const v of ["/login", "/api/v1/auth/me", "/invoices", "/invoice-evil", "/unknown", "/"]) {
      expect(safeNext(v)).toBe("/dashboard");
    }
  });

  it("rejects absurdly long values", () => {
    expect(safeNext(`/invoice?x=${"a".repeat(3000)}`)).toBe("/dashboard");
  });
});
