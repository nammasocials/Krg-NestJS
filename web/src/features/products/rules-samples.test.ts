import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { rupeesToPaise } from "./money";
import { HSN_PATTERN, isValidOpeningStock, PRODUCT_NAME_PATTERN } from "./product-schema";
import { GST_RATES } from "./product.types";

// The same file is read by the API's tests (api/src/products/rules-samples.spec.ts).
const samples = JSON.parse(
  readFileSync(fileURLToPath(new URL("../../../../shared/product-rules.samples.json", import.meta.url)), "utf8"),
) as {
  name: { value: string; valid: boolean }[];
  hsn: { value: string; valid: boolean }[];
  rupees: { input: string; paise: number | null }[];
  gstRate: { value: number; valid: boolean }[];
  openingStock: { value: number; valid: boolean }[];
};

describe("shared product rule samples (web side)", () => {
  it.each(samples.name.map((s) => [JSON.stringify(s.value), s.value, s.valid] as const))("name %s", (_l, value, valid) => {
    expect(PRODUCT_NAME_PATTERN.test(value)).toBe(valid);
  });

  it.each(samples.hsn.map((s) => [JSON.stringify(s.value), s.value, s.valid] as const))("HSN %s", (_l, value, valid) => {
    expect(HSN_PATTERN.test(value)).toBe(valid);
  });

  it.each(samples.rupees.map((s) => [JSON.stringify(s.input), s.input, s.paise] as const))("rupees %s", (_l, input, paise) => {
    expect(rupeesToPaise(input)).toBe(paise);
  });

  it.each(samples.gstRate.map((s) => [s.value, s.valid] as const))("GST rate %s", (value, valid) => {
    expect((GST_RATES as readonly number[]).includes(value)).toBe(valid);
  });

  it.each(samples.openingStock.map((s) => [s.value, s.valid] as const))("opening stock %s", (value, valid) => {
    expect(isValidOpeningStock(value)).toBe(valid);
  });
});
