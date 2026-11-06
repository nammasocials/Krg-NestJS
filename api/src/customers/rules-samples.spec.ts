import { readFileSync } from "node:fs";
import path from "node:path";
import { CITY_PATTERN, NAME_PATTERN } from "./dto/create-customer.dto";
import { isValidGstin } from "./gstin";
import { normalizePhone } from "./phone";

// The same file is read by the web form's tests (web/src/features/customers/rules-samples.test.ts).
const samples = JSON.parse(
  readFileSync(path.resolve(__dirname, "../../../shared/customer-rules.samples.json"), "utf8"),
) as {
  gstin: { value: string; valid: boolean }[];
  phone: { input: string; normalized: string | null }[];
  name: { value: string; valid: boolean }[];
  city: { value: string; valid: boolean }[];
};

describe("shared rule samples (API side)", () => {
  it.each(samples.gstin.map((s) => [JSON.stringify(s.value), s.value, s.valid] as const))(
    "GSTIN %s",
    (_label, value, valid) => {
      expect(isValidGstin(value)).toBe(valid);
    },
  );

  it.each(samples.phone.map((s) => [JSON.stringify(s.input), s.input, s.normalized] as const))(
    "phone %s",
    (_label, input, normalized) => {
      expect(normalizePhone(input)).toBe(normalized);
    },
  );

  it.each(samples.name.map((s) => [s.value, s.valid] as const))("name %s", (value, valid) => {
    expect(NAME_PATTERN.test(value)).toBe(valid);
  });

  it.each(samples.city.map((s) => [s.value, s.valid] as const))("city %s", (value, valid) => {
    expect(CITY_PATTERN.test(value)).toBe(valid);
  });
});
