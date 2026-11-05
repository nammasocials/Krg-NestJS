import { normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("returns plain 10-digit mobiles unchanged", () => {
    expect(normalizePhone("9876543210")).toBe("9876543210");
    expect(normalizePhone("6000000000")).toBe("6000000000");
  });

  it("drops +91, 91 and 0 prefixes", () => {
    expect(normalizePhone("+919876543210")).toBe("9876543210");
    expect(normalizePhone("919876543210")).toBe("9876543210");
    expect(normalizePhone("09876543210")).toBe("9876543210");
  });

  it("ignores spaces and dashes and surrounding blanks", () => {
    expect(normalizePhone(" +91 98765-43210 ")).toBe("9876543210");
    expect(normalizePhone("98765 43210")).toBe("9876543210");
  });

  it("keeps a number that merely starts with 91", () => {
    expect(normalizePhone("9123456789")).toBe("9123456789");
  });

  it("rejects landline-style, short, long and non-numeric values", () => {
    for (const bad of ["", "12345", "5876543210", "98765432101", "+449876543210", "98765abcde", "+91 98765", "0000000000"]) {
      expect(normalizePhone(bad)).toBeNull();
    }
  });
});
