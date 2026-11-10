import { describe, expect, it } from "vitest";
import { paiseToRupees, rupeesToPaise } from "./money";

describe("rupeesToPaise", () => {
  it("converts exactly, with no floating-point error", () => {
    expect(rupeesToPaise("0.29")).toBe(29); // 0.29 * 100 is 28.999… in floating point
    expect(rupeesToPaise("1.15")).toBe(115);
    expect(rupeesToPaise("19.99")).toBe(1999);
    expect(rupeesToPaise("4.35")).toBe(435);
    expect(rupeesToPaise("999999999.99")).toBe(99_999_999_999);
  });

  it("accepts whole rupees, one decimal and surrounding spaces", () => {
    expect(rupeesToPaise("5")).toBe(500);
    expect(rupeesToPaise("0.1")).toBe(10);
    expect(rupeesToPaise(" 12.50 ")).toBe(1250);
    expect(rupeesToPaise("0")).toBe(0);
  });

  it("refuses everything else", () => {
    for (const bad of ["", "abc", "-1", "1e3", "10.", ".5", "1.234", "1,000", "1 000", "9999999999", "₹5"]) {
      expect(rupeesToPaise(bad)).toBeNull();
    }
  });
});

describe("paiseToRupees", () => {
  it("shows two decimals", () => {
    expect(paiseToRupees(0)).toBe("0.00");
    expect(paiseToRupees(5)).toBe("0.05");
    expect(paiseToRupees(125050)).toBe("1250.50");
  });

  it("round-trips with rupeesToPaise", () => {
    for (const p of [0, 1, 99, 100, 12345, 99_999_999_999]) expect(rupeesToPaise(paiseToRupees(p))).toBe(p);
  });

  it("rejects negatives and fractions", () => {
    expect(() => paiseToRupees(-1)).toThrow(RangeError);
    expect(() => paiseToRupees(1.5)).toThrow(RangeError);
  });
});
