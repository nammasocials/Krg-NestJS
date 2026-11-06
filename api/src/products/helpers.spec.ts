import { GST_RATES, isGstRate } from "./gst-rates";
import { isHsn } from "./hsn";
import { paiseToRupees, rupeesToPaise } from "./money";
import { isUnit, UNIT_CODES, UNITS, unitQuantityLabel } from "./units";

describe("units", () => {
  it("knows piece and pack, a pack being 10 pieces", () => {
    expect(UNIT_CODES).toEqual(["PIECE", "PACK"]);
    expect(UNITS.PIECE.baseQty).toBe(1);
    expect(UNITS.PACK.baseQty).toBe(10);
  });

  it("accepts only the codes", () => {
    expect(isUnit("PIECE")).toBe(true);
    expect(isUnit("PACK")).toBe(true);
    for (const v of ["piece", "BOX", "", null, undefined, 1]) expect(isUnit(v)).toBe(false);
  });

  it("words quantities like the old system", () => {
    expect(unitQuantityLabel("PIECE", 1)).toBe("1 Piece (pc)");
    expect(unitQuantityLabel("PIECE", 3)).toBe("3 Pieces (pcs)");
    expect(unitQuantityLabel("PACK", 5)).toBe("5 Packs (pks)");
    expect(unitQuantityLabel("PACK", 1)).toBe("1 Pack (pk)");
    expect(unitQuantityLabel("PACK", 0)).toBe("0 Packs (pks)");
  });
});

describe("GST rates", () => {
  it("has the allowed slabs", () => {
    expect([...GST_RATES]).toEqual([0, 0.25, 3, 5, 12, 18, 28]);
  });

  it("accepts a slab and nothing else", () => {
    for (const r of GST_RATES) expect(isGstRate(r)).toBe(true);
    for (const v of [1, 9, 17.5, 100, -5, "18", null, undefined, NaN]) expect(isGstRate(v)).toBe(false);
  });
});

describe("HSN codes", () => {
  it("accepts 4, 6 and 8 digits", () => {
    for (const v of ["1006", "100630", "10063010", "0101"]) expect(isHsn(v)).toBe(true);
  });

  it("rejects other lengths, letters, spaces and non-strings", () => {
    for (const v of ["", "100", "10063", "1006301", "100630100", "10A6", " 1006", "1006 ", 1006, null]) {
      expect(isHsn(v)).toBe(false);
    }
  });
});

describe("rupeesToPaise", () => {
  it.each([
    ["0", 0],
    ["5", 500],
    [" 5 ", 500],
    ["12.5", 1250],
    ["12.50", 1250],
    ["12.05", 1205],
    ["0.1", 10],
    ["0.29", 29], // 0.29 * 100 is 28.999999999999996 in floating point
    ["1.15", 115],
    ["19.99", 1999],
    ["0.01", 1],
    ["007", 700],
    ["999999999.99", 99999999999],
  ])("%j is %d paise", (input, paise) => {
    expect(rupeesToPaise(input)).toBe(paise);
  });

  it.each(["", " ", "abc", "-1", "+5", "1e3", "10.", ".5", "1.234", "1,000", "1 000", "₹5", "5.5.5", "1000000000", "NaN", "Infinity"])(
    "%j is refused",
    (input) => {
      expect(rupeesToPaise(input)).toBeNull();
    },
  );

  it("is exact for every amount up to ₹50 with two decimals", () => {
    for (let p = 0; p <= 5000; p++) {
      expect(rupeesToPaise(paiseToRupees(p))).toBe(p);
    }
  });
});

describe("paiseToRupees", () => {
  it.each([
    [0, "0.00"],
    [1, "0.01"],
    [10, "0.10"],
    [1250, "12.50"],
    [99999999999, "999999999.99"],
  ])("%d is %s", (paise, text) => {
    expect(paiseToRupees(paise)).toBe(text);
  });

  it("refuses fractions, negatives and unsafe numbers", () => {
    for (const v of [0.5, -1, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      expect(() => paiseToRupees(v)).toThrow(RangeError);
    }
  });
});
