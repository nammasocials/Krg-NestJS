import { describe, expect, it } from "vitest";
import { formatGstRate, formatRupees, formatStock, unitName } from "./format";

describe("formatRupees", () => {
  it("shows rupees and paise with Indian grouping", () => {
    expect(formatRupees(0)).toBe("₹0.00");
    expect(formatRupees(5)).toBe("₹0.05");
    expect(formatRupees(100)).toBe("₹1.00");
    expect(formatRupees(125050)).toBe("₹1,250.50");
    expect(formatRupees(10000000)).toBe("₹1,00,000.00");
    expect(formatRupees(99_999_999_999)).toBe("₹99,99,99,999.99");
  });

  it("handles negatives and refuses non-integers", () => {
    expect(formatRupees(-150)).toBe("-₹1.50");
    expect(formatRupees(10.5)).toBe("");
    expect(formatRupees(Number.NaN)).toBe("");
  });
});

describe("labels", () => {
  it("names units", () => {
    expect(unitName("PIECE")).toBe("Piece");
    expect(unitName("PACK")).toBe("Pack (10 pieces)");
  });

  it("formats GST rates and stock", () => {
    expect(formatGstRate(0.25)).toBe("0.25%");
    expect(formatGstRate(18)).toBe("18%");
    expect(formatStock(0)).toBe("0 pcs");
    expect(formatStock(1)).toBe("1 pc");
    expect(formatStock(125000)).toBe("1,25,000 pcs");
  });
});
