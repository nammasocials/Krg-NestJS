import { readFileSync } from "node:fs";
import path from "node:path";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { CreateProductDto, PRODUCT_NAME_PATTERN } from "./dto/create-product.dto";
import { isGstRate } from "./gst-rates";
import { isHsn } from "./hsn";
import { rupeesToPaise } from "./money";

// The same file is read by the web form's tests (web/src/features/products/rules-samples.test.ts).
const samples = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../shared/product-rules.samples.json"), "utf8"),
) as {
  name: { value: string; valid: boolean }[];
  hsn: { value: string; valid: boolean }[];
  rupees: { input: string; paise: number | null }[];
  gstRate: { value: number; valid: boolean }[];
  openingStock: { value: number; valid: boolean }[];
};

describe("shared product rule samples (API side)", () => {
  it.each(samples.name.map((s) => [JSON.stringify(s.value), s.value, s.valid] as const))("name %s", (_l, value, valid) => {
    expect(PRODUCT_NAME_PATTERN.test(value)).toBe(valid);
  });

  it.each(samples.hsn.map((s) => [JSON.stringify(s.value), s.value, s.valid] as const))("HSN %s", (_l, value, valid) => {
    expect(isHsn(value)).toBe(valid);
  });

  it.each(samples.rupees.map((s) => [JSON.stringify(s.input), s.input, s.paise] as const))("rupees %s", (_l, input, paise) => {
    expect(rupeesToPaise(input)).toBe(paise);
  });

  it.each(samples.gstRate.map((s) => [s.value, s.valid] as const))("GST rate %s", (value, valid) => {
    expect(isGstRate(value)).toBe(valid);
  });

  // The real DTO rules, not a copy of them.
  it.each(samples.openingStock.map((s) => [s.value, s.valid] as const))("opening stock %s", (value, valid) => {
    const dto = plainToInstance(CreateProductDto, { name: "Rice", unit: "PIECE", unitPrice: 100, hsnCode: "1006", gstRate: 5, openingStock: value });
    const problems = validateSync(dto).filter((e) => e.property === "openingStock");
    expect(problems.length === 0).toBe(valid);
  });
});
