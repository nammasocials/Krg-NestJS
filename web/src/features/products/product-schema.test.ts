import { describe, expect, it } from "vitest";
import { buildUpdate, EMPTY_VALUES, productSchema, toFormValues, toInput } from "./product-schema";
import type { Product } from "./product.types";

const valid = { name: " Basmati Rice ", unit: "PACK", unitPrice: "1250.50", hsnCode: "10063020", gstRate: "5", isActive: true, openingStock: "" };
const saved: Product = {
  id: "1",
  name: "Basmati Rice",
  unit: "PACK",
  unitPrice: 125050,
  hsnCode: "10063020",
  gstRate: 5,
  stock: { qtyOnHand: 0 },
  isActive: true,
  isDeleted: false,
  createdAt: "2026-11-09T00:00:00Z",
  updatedAt: "2026-11-09T00:00:00Z",
};

const messages = (values: unknown) => {
  const r = productSchema.safeParse(values);
  const out: Record<string, string> = {};
  if (!r.success) for (const i of r.error.issues) out[String(i.path[0])] ??= i.message; // the first message per field is the one shown
  return out;
};

describe("productSchema", () => {
  it("accepts a good product", () => {
    expect(productSchema.safeParse(valid).success).toBe(true);
  });

  it("names the problem for each bad field", () => {
    const m = messages({ ...EMPTY_VALUES, unit: "BOX", gstRate: "7", unitPrice: "1.234", hsnCode: "12" });
    expect(m.name).toBe("Name is required.");
    expect(m.unit).toBe("Choose a unit.");
    expect(m.unitPrice).toMatch(/up to 2 decimals/);
    expect(m.hsnCode).toBe("HSN code must be 4, 6 or 8 digits.");
    expect(m.gstRate).toBe("Choose a GST rate from the list.");
  });

  it("requires a price and a GST rate", () => {
    const m = messages({ ...valid, unitPrice: "", gstRate: "" });
    expect(m.unitPrice).toBe("Price is required.");
    expect(m.gstRate).toBe("Choose a GST rate.");
  });
});

describe("opening stock", () => {
  it("is optional: empty means 0 and is not sent", () => {
    expect(productSchema.safeParse({ ...valid, openingStock: "" }).success).toBe(true);
    expect(toInput({ ...valid, openingStock: "" } as never)).not.toHaveProperty("openingStock");
    expect(toInput({ ...valid, openingStock: "0" } as never)).not.toHaveProperty("openingStock");
  });

  it("is sent as a number when above 0", () => {
    expect(toInput({ ...valid, openingStock: " 25 " } as never).openingStock).toBe(25);
  });

  it("refuses negatives, fractions, text and too large values", () => {
    for (const bad of ["-1", "2.5", "ten", "1e3", "1000001", "12345678"]) {
      expect(messages({ ...valid, openingStock: bad }).openingStock).toMatch(/whole number of pieces/);
    }
    expect(productSchema.safeParse({ ...valid, openingStock: "1000000" }).success).toBe(true);
  });

  it("is never part of an edit", () => {
    const form = { ...toFormValues(saved), openingStock: "50" };
    expect(buildUpdate(saved, form)).toEqual({});
  });
});

describe("toInput / toFormValues / buildUpdate", () => {
  it("sends trimmed text, price in paise and the rate as a number", () => {
    expect(toInput(valid as never)).toEqual({ name: "Basmati Rice", unit: "PACK", unitPrice: 125050, hsnCode: "10063020", gstRate: 5 });
    expect(toInput({ ...valid, gstRate: "0.25" } as never).gstRate).toBe(0.25);
  });

  it("fills the form from a saved product", () => {
    expect(toFormValues(saved)).toEqual({ name: "Basmati Rice", unit: "PACK", unitPrice: "1250.50", hsnCode: "10063020", gstRate: "5", isActive: true, openingStock: "" });
  });

  it("sends nothing when nothing changed, and only what changed otherwise", () => {
    expect(buildUpdate(saved, toFormValues(saved))).toEqual({});
    expect(buildUpdate(saved, { ...toFormValues(saved), unitPrice: "99.90", isActive: false })).toEqual({ unitPrice: 9990, isActive: false });
    expect(buildUpdate(saved, { ...toFormValues(saved), unitPrice: "1250.5" })).toEqual({});
  });
});
