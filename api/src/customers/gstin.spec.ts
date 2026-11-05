import { gstinCheckChar, isValidGstin, normalizeGstin, stateCodeOf } from "./gstin";
import { STATE_NAMES, isStateCode } from "./state-codes";

/** Build a GSTIN with a correct check character from a state code and a 12-character body. */
const make = (state: string, body: string) => {
  const first14 = `${state}${body}`;
  return `${first14}${gstinCheckChar(first14)}`;
};

describe("GSTIN", () => {
  it("accepts a well-known valid number", () => {
    expect(isValidGstin("27AAPFU0939F1ZV")).toBe(true);
  });

  it("accepts numbers built with the check character for several states", () => {
    for (const state of ["07", "24", "27", "29", "33", "36"]) {
      expect(isValidGstin(make(state, "ABCDE1234F1Z"))).toBe(true);
    }
  });

  it("rejects a wrong check character", () => {
    expect(isValidGstin("27AAPFU0939F1ZX")).toBe(false);
    expect(isValidGstin("27AAPFU0939F1Z0")).toBe(false);
  });

  it("rejects a wrong length or shape", () => {
    expect(isValidGstin("")).toBe(false);
    expect(isValidGstin("27AAPFU0939F1Z")).toBe(false);
    expect(isValidGstin("27AAPFU0939F1ZVV")).toBe(false);
    expect(isValidGstin("27AAPFU0939F1AV")).toBe(false); // 14th character must be Z
    expect(isValidGstin("27AAPF10939F1ZV")).toBe(false); // the PAN letters part has a digit
    expect(isValidGstin("27AAPFU0939F0ZV")).toBe(false); // entity number cannot be 0
  });

  it("rejects an unknown state code even with a matching check character", () => {
    expect(isValidGstin(make("25", "ABCDE1234F1Z"))).toBe(false);
    expect(isValidGstin(make("00", "ABCDE1234F1Z"))).toBe(false);
    expect(isValidGstin(make("40", "ABCDE1234F1Z"))).toBe(false);
  });

  it("trims and upper-cases before checking", () => {
    expect(isValidGstin("  27aapfu0939f1zv ")).toBe(true);
    expect(normalizeGstin(" 27aapfu0939f1zv ")).toBe("27AAPFU0939F1ZV");
  });

  it("derives the state code from the first two digits", () => {
    expect(stateCodeOf("27AAPFU0939F1ZV")).toBe("27");
    expect(stateCodeOf(" 29aabct1332l1zu")).toBe("29");
  });

  it("catches a mistyped character and a swap of neighbouring characters", () => {
    const good = make("27", "ABCDE1234F1Z");
    expect(isValidGstin(good.replace("ABCDE", "ABCDF"))).toBe(false);
    expect(isValidGstin(good.replace("E1", "1E"))).toBe(false);
  });
});

describe("state codes", () => {
  it("lists real codes and rejects retired or unknown ones", () => {
    for (const code of ["07", "24", "27", "29", "32", "33", "36", "37", "38", "97", "99"]) {
      expect(isStateCode(code)).toBe(true);
    }
    for (const code of ["00", "25", "28", "39", "98", "ab", "__proto__", "constructor"]) {
      expect(isStateCode(code)).toBe(false);
    }
  });

  it("has a name for every code", () => {
    expect(Object.values(STATE_NAMES).every((n) => n.length > 2)).toBe(true);
    expect(Object.keys(STATE_NAMES)).toHaveLength(38);
  });
});
