import { describe, expect, it } from "vitest";
import { gstPreview } from "./gst-preview";

describe("gstPreview", () => {
  it("adds the GST to the price", () => {
    expect(gstPreview(10000, 18)).toEqual({ gst: 1800, cgst: 900, sgst: 900, total: 11800 });
    expect(gstPreview(125050, 5)).toEqual({ gst: 6253, cgst: 3126, sgst: 3127, total: 131303 });
  });

  it("handles no GST and fractional rates", () => {
    expect(gstPreview(10000, 0)).toEqual({ gst: 0, cgst: 0, sgst: 0, total: 10000 });
    expect(gstPreview(100000, 0.25)).toEqual({ gst: 250, cgst: 125, sgst: 125, total: 100250 });
    expect(gstPreview(100000, 3)).toEqual({ gst: 3000, cgst: 1500, sgst: 1500, total: 103000 });
  });

  it("always splits into whole paise that add up", () => {
    for (const price of [1, 7, 99, 12345]) {
      for (const rate of [0, 0.25, 3, 5, 12, 18, 28]) {
        const p = gstPreview(price, rate);
        expect(p.cgst + p.sgst).toBe(p.gst);
        expect(p.total).toBe(price + p.gst);
        expect(Number.isInteger(p.gst)).toBe(true);
      }
    }
  });
});
