import { describe, expect, it } from "vitest";
import { changeClass, formatChange, formatDateTime, kindLabel, noteLabel, whoText } from "./stock-history-format";

describe("stock history formatting", () => {
  it("shows the sign with a real minus and Indian grouping", () => {
    expect(formatChange(40)).toBe("+40");
    expect(formatChange(-3)).toBe("−3");
    expect(formatChange(100000)).toBe("+1,00,000");
    expect(formatChange(-1000000)).toBe("−10,00,000");
  });
  it("colours additions green and removals red", () => {
    expect(changeClass(5)).toContain("green");
    expect(changeClass(-5)).toContain("red");
  });
  it("labels every kind", () => {
    expect(kindLabel("OPENING")).toBe("Opening stock");
    expect(kindLabel("STOCK_IN")).toBe("Stock in");
    expect(kindLabel("SALE")).toBe("Sale");
    expect(kindLabel("SALE_CANCEL")).toBe("Sale cancelled");
    expect(kindLabel("ADJUSTMENT")).toBe("Adjustment");
  });
  it("says Reason for adjustments and Note otherwise", () => {
    expect(noteLabel("ADJUSTMENT")).toBe("Reason");
    expect(noteLabel("STOCK_IN")).toBe("Note");
  });
  it("shows who, or a dash", () => {
    expect(whoText({ createdBy: { id: "1", name: " Asha " } })).toBe("Asha");
    expect(whoText({})).toBe("—");
    expect(whoText({ createdBy: { id: "1", name: "  " } })).toBe("—");
  });
  it("formats date and time, empty for junk", () => {
    expect(formatDateTime("2026-11-09T10:05:00Z")).toMatch(/^9 Nov 2026, \d{1,2}:\d{2} (am|pm)$/);
    expect(formatDateTime("nope")).toBe("");
  });
});
