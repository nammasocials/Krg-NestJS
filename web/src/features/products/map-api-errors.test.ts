import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { mapApiError } from "./map-api-errors";

const apiError = (code: string, errors?: string[]) => {
  const e = Object.create(ApiError.prototype) as ApiError;
  Object.assign(e, { code, status: 400, message: "x", data: errors ? { errors } : null });
  return e;
};

describe("mapApiError", () => {
  it("puts PRODUCT_NAME_EXISTS on the name", () => {
    expect(mapApiError(apiError("PRODUCT_NAME_EXISTS", ["name is already used by another product"])).fields.name).toBe(
      "A product with this name already exists.",
    );
  });

  it("places validation messages on their fields", () => {
    const m = mapApiError(apiError("VALIDATION_FAILED", ["hsnCode must be 4, 6 or 8 digits", "unitPrice must not be negative", "gstRate must be one of: 0, 5"]));
    expect(m.fields.hsnCode).toBe("HSN code must be 4, 6 or 8 digits.");
    expect(m.fields.unitPrice).toBe("Price must not be negative.");
    expect(m.fields.gstRate).toBe("GST rate must be one of: 0, 5.");
    expect(m.general).toEqual([]);
  });

  it("keeps unknown messages as general and ignores other errors", () => {
    expect(mapApiError(apiError("VALIDATION_FAILED", ["property stock should not exist"])).general).toEqual(["property stock should not exist"]);
    expect(mapApiError(new Error("boom"))).toEqual({ fields: {}, general: [] });
  });
});
