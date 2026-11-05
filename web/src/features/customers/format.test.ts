import { describe, expect, it } from "vitest";
import { formatDate, formatPhone } from "./format";

describe("formatPhone", () => {
  it("groups ten digits as 5 + 5", () => {
    expect(formatPhone("9876543210")).toBe("98765 43210");
  });
  it("leaves anything else alone", () => {
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone("")).toBe("");
  });
});

describe("formatDate", () => {
  it("formats an ISO timestamp", () => {
    expect(formatDate("2026-11-05T12:00:00.000Z")).toBe("5 Nov 2026");
  });
  it("returns empty text for rubbish", () => {
    expect(formatDate("not a date")).toBe("");
  });
});
