import { readFileSync } from "node:fs";
import path from "node:path";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { StockInDto } from "./dto/stock-in.dto";

// The same file is read by the stock entry screen's tests (web/src/features/products/stock-entry-schema.test.ts).
interface Sample<T> {
  value: T;
  count?: number;
  valid: boolean;
}
const samples = JSON.parse(readFileSync(path.resolve(__dirname, "../../../shared/stock-rules.samples.json"), "utf8")) as {
  stockInQuantity: Sample<number>[];
  adjustmentQuantity: Sample<number>[];
  stockInNote: Sample<string>[];
  reason: Sample<string>[];
};

const text = (s: Sample<string>) => (s.count ? s.value.repeat(s.count) : s.value);
const problems = (dto: object, property: string) => validateSync(dto).filter((e) => e.property === property);

// The real DTO rules, not a copy of them.
describe("shared stock rule samples (API side)", () => {
  it.each(samples.stockInQuantity.map((s) => [s.value, s.valid] as const))("stock-in quantity %s", (value, valid) => {
    expect(problems(plainToInstance(StockInDto, { quantity: value }), "quantity").length === 0).toBe(valid);
  });

  it.each(samples.adjustmentQuantity.map((s) => [s.value, s.valid] as const))("adjustment quantity %s", (value, valid) => {
    expect(problems(plainToInstance(StockAdjustmentDto, { quantity: value, note: "Recount" }), "quantity").length === 0).toBe(valid);
  });

  it.each(samples.stockInNote.map((s) => [JSON.stringify(text(s)).slice(0, 30), s, s.valid] as const))("stock-in note %s", (_l, s, valid) => {
    expect(problems(plainToInstance(StockInDto, { quantity: 1, note: text(s) }), "note").length === 0).toBe(valid);
  });

  it.each(samples.reason.map((s) => [JSON.stringify(text(s)).slice(0, 30), s, s.valid] as const))("reason %s", (_l, s, valid) => {
    expect(problems(plainToInstance(StockAdjustmentDto, { quantity: 1, note: text(s) }), "note").length === 0).toBe(valid);
  });
});
