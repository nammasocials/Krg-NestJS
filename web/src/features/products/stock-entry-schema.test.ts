import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import {
  EMPTY_ENTRY,
  isValidAdjustmentQuantity,
  isValidReason,
  isValidStockInNote,
  isValidStockInQuantity,
  mapStockError,
  previewBalance,
  quantityProblem,
  stockEntrySchema,
  toPieces,
  toRequest,
} from "./stock-entry-schema";

interface Sample<T> {
  value: T;
  count?: number;
  valid: boolean;
}
// The same file is read by the API's tests (api/src/stock/rules-samples.spec.ts).
const samples = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../../shared/stock-rules.samples.json", import.meta.url)), "utf8"),
) as {
  stockInQuantity: Sample<number>[];
  adjustmentQuantity: Sample<number>[];
  stockInNote: Sample<string>[];
  reason: Sample<string>[];
};
const text = (s: Sample<string>) => (s.count ? s.value.repeat(s.count) : s.value);

describe("shared stock rule samples (web side)", () => {
  it.each(samples.stockInQuantity.map((s) => [s.value, s.valid] as const))("stock-in quantity %s", (v, valid) => {
    expect(isValidStockInQuantity(v)).toBe(valid);
  });
  it.each(samples.adjustmentQuantity.map((s) => [s.value, s.valid] as const))("adjustment quantity %s", (v, valid) => {
    expect(isValidAdjustmentQuantity(v)).toBe(valid);
  });
  it.each(samples.stockInNote.map((s) => [JSON.stringify(text(s)).slice(0, 30), s, s.valid] as const))("stock-in note %s", (_l, s, valid) => {
    expect(isValidStockInNote(text(s))).toBe(valid);
  });
  it.each(samples.reason.map((s) => [JSON.stringify(text(s)).slice(0, 30), s, s.valid] as const))("reason %s", (_l, s, valid) => {
    expect(isValidReason(text(s))).toBe(valid);
  });
});

describe("toPieces", () => {
  it("counts packs as exactly 10 pieces", () => {
    expect(toPieces("4", "PACK")).toBe(40);
    expect(toPieces(" 25 ", "PIECE")).toBe(25);
  });
  it.each(["", "abc", "1.5", "-3", "1e3", "1234567890"])("%j is not a whole number", (t) => {
    expect(toPieces(t, "PIECE")).toBeNull();
  });
});

describe("quantityProblem", () => {
  it("accepts the edges, in pieces and packs", () => {
    expect(quantityProblem("1", "PIECE")).toBeNull();
    expect(quantityProblem("1000000", "PIECE")).toBeNull();
    expect(quantityProblem("100000", "PACK")).toBeNull();
  });
  it("refuses empty, zero, fractions and too many (packs count as 10)", () => {
    expect(quantityProblem("", "PIECE")).toMatch(/Enter the quantity/);
    expect(quantityProblem("0", "PIECE")).toMatch(/at least 1/);
    expect(quantityProblem("2.5", "PIECE")).toMatch(/whole number of pieces/);
    expect(quantityProblem("2.5", "PACK")).toMatch(/whole number of packs/);
    expect(quantityProblem("1000001", "PIECE")).toMatch(/At most 10,00,000 pieces/);
    expect(quantityProblem("100001", "PACK")).toMatch(/At most/);
  });
});

describe("stockEntrySchema", () => {
  const issues = (v: Partial<typeof EMPTY_ENTRY>) => {
    const r = stockEntrySchema.safeParse({ ...EMPTY_ENTRY, ...v });
    return r.success ? {} : Object.fromEntries(r.error.issues.map((i) => [i.path[0], i.message]));
  };
  it("stock in needs only a quantity", () => {
    expect(issues({ quantity: "40" })).toEqual({});
    expect(issues({})).toHaveProperty("quantity");
  });
  it("adjustments need a reason of 3+ characters", () => {
    expect(issues({ kind: "DECREASE", quantity: "3" })).toHaveProperty("note");
    expect(issues({ kind: "DECREASE", quantity: "3", note: "ab" })).toHaveProperty("note");
    expect(issues({ kind: "DECREASE", quantity: "3", note: "Damaged" })).toEqual({});
  });
  it("a stock-in note over 200 characters is refused", () => {
    expect(issues({ quantity: "1", note: "x".repeat(201) })).toHaveProperty("note");
  });
});

describe("toRequest", () => {
  it("stock in: pieces, trimmed note, none when blank", () => {
    expect(toRequest({ kind: "IN", unit: "PACK", quantity: "4", note: " Bill 118 " })).toEqual({
      endpoint: "stock-in",
      body: { quantity: 40, note: "Bill 118" },
    });
    expect(toRequest({ kind: "IN", unit: "PIECE", quantity: "5", note: "  " })).toEqual({ endpoint: "stock-in", body: { quantity: 5 } });
  });
  it("adjustments are signed", () => {
    expect(toRequest({ kind: "DECREASE", unit: "PIECE", quantity: "3", note: "Damaged" }).body).toEqual({ quantity: -3, note: "Damaged" });
    expect(toRequest({ kind: "INCREASE", unit: "PACK", quantity: "2", note: "Found" })).toEqual({
      endpoint: "stock-adjustments",
      body: { quantity: 20, note: "Found" },
    });
  });
});

describe("previewBalance", () => {
  it("adds and removes", () => {
    expect(previewBalance(25, "IN", 40)).toEqual({ state: "ok", after: 65 });
    expect(previewBalance(25, "DECREASE", 25)).toEqual({ state: "ok", after: 0 });
  });
  it("refuses below 0 and above the limit", () => {
    expect(previewBalance(25, "DECREASE", 26)).toEqual({ state: "short", available: 25 });
    expect(previewBalance(100_000_000, "INCREASE", 1)).toEqual({ state: "limit" });
    expect(previewBalance(99_999_999, "IN", 1)).toEqual({ state: "ok", after: 100_000_000 });
  });
});

describe("mapStockError", () => {
  const err = (code: string, errors: string[]) => new ApiError(409, code, "msg", { errors });
  it("shows INSUFFICIENT_STOCK and STOCK_LIMIT_EXCEEDED on the quantity field", () => {
    expect(mapStockError(err("INSUFFICIENT_STOCK", ["Rice: 5 in stock, 6 requested"])).fields.quantity).toBe("Rice: 5 in stock, 6 requested");
    expect(mapStockError(err("STOCK_LIMIT_EXCEEDED", ["Rice: 1 in stock, the limit is 100000000"])).fields.quantity).toMatch(/limit/);
  });
  it("maps validation messages by field name; others go to general", () => {
    const m = mapStockError(err("VALIDATION_FAILED", ["quantity must not be 0", "note must be 3 to 200 characters", "something else"]));
    expect(m.fields).toEqual({ quantity: "quantity must not be 0.", note: "note must be 3 to 200 characters." });
    expect(m.general).toEqual(["something else"]);
  });
  it("ignores other errors", () => {
    expect(mapStockError(new Error("x"))).toEqual({ fields: {}, general: [] });
  });
});
