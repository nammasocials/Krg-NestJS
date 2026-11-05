import { describe, expect, it } from "vitest";
import { toastOptions } from "./toast-options";

describe("toastOptions", () => {
  it("uses 5 s for success and info, 8 s for errors", () => {
    expect(toastOptions("success", "Saved").timeout).toBe(5000);
    expect(toastOptions("info", "FYI").timeout).toBe(5000);
    expect(toastOptions("error", "Failed").timeout).toBe(8000);
  });
  it("gives default titles and lets the caller override title and duration", () => {
    expect(toastOptions("error", "x").title).toBe("Error");
    expect(toastOptions("success", "x", { title: "Customer saved", duration: 0 })).toMatchObject({
      title: "Customer saved",
      timeout: 0,
    });
  });
  it("makes only errors high priority (assertive for screen readers)", () => {
    expect(toastOptions("error", "x").priority).toBe("high");
    expect(toastOptions("success", "x").priority).toBe("low");
    expect(toastOptions("info", "x").priority).toBe("low");
  });
  it("passes the message through untouched as the description", () => {
    expect(toastOptions("info", "<b>hi</b>").description).toBe("<b>hi</b>");
    expect(toastOptions("info", "x").type).toBe("info");
  });
});
