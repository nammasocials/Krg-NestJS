import { describe, expect, it } from "vitest";
import { ApiError, NetworkError } from "@/lib/api/client";
import { isFieldError, mapApiError } from "./map-api-errors";

const validation = (errors: string[]) => new ApiError(400, "VALIDATION_FAILED", "Validation failed", { errors });

describe("mapApiError", () => {
  it("puts the duplicate-GSTIN answer on the GSTIN field", () => {
    const err = new ApiError(409, "GSTIN_EXISTS", "A customer with this GSTIN already exists.", {
      errors: ["gstin is already used by another customer"],
    });
    expect(mapApiError(err)).toEqual({ fields: { gstin: "A customer with this GSTIN already exists." }, general: [] });
  });

  it("maps each validation message to its field by the path it starts with", () => {
    const mapped = mapApiError(
      validation([
        "name must be longer than or equal to 2 characters",
        "email must be a valid email address",
        "phone must be a valid Indian mobile number",
        "phoneAlt must be a valid Indian mobile number",
        "address.line must be shorter than or equal to 200 characters",
        "address.city must contain letters only",
        "address.pincode must be 6 digits and not start with 0",
        "gstin must be a valid GSTIN: check the number",
      ]),
    );
    expect(Object.keys(mapped.fields).sort()).toEqual(
      ["addressLine", "city", "email", "gstin", "name", "phone", "phoneAlt", "pincode"],
    );
    expect(mapped.general).toEqual([]);
    expect(mapped.fields.pincode).toBe("Pincode must be 6 digits and not start with 0.");
    expect(mapped.fields.gstin).toBe("GSTIN must be a valid GSTIN: check the number.");
    expect(mapped.fields.phone).toBe("Phone must be a valid Indian mobile number.");
    expect(mapped.fields.phoneAlt).toBe("Alternate phone must be a valid Indian mobile number.");
  });

  it("does not confuse phoneAlt with phone, nor address.* with address", () => {
    const mapped = mapApiError(validation(["phoneAlt is bad", "address is required"]));
    expect(mapped.fields).toEqual({ phoneAlt: "Alternate phone is bad.", addressLine: "Address is required." });
  });

  it("keeps the first message when a field has several", () => {
    const mapped = mapApiError(validation(["name is too short", "name has bad characters"]));
    expect(mapped.fields.name).toBe("Name is too short.");
  });

  it("keeps messages that name no known field as general messages", () => {
    const mapped = mapApiError(validation(["something odd happened", "name is too short"]));
    expect(mapped.general).toEqual(["something odd happened"]);
    expect(Object.keys(mapped.fields)).toEqual(["name"]);
  });

  it("returns nothing for other errors", () => {
    for (const err of [
      new ApiError(500, "INTERNAL_ERROR", "Something went wrong."),
      new ApiError(404, "NOT_FOUND", "Customer not found"),
      new ApiError(400, "BAD_REQUEST", "Send at least one field to change."),
      new NetworkError(),
      new Error("x"),
      "text",
      null,
    ]) {
      expect(mapApiError(err)).toEqual({ fields: {}, general: [] });
    }
  });

  it("ignores a malformed errors list", () => {
    expect(mapApiError(new ApiError(400, "VALIDATION_FAILED", "x", { errors: "name bad" })).fields).toEqual({});
    expect(mapApiError(new ApiError(400, "VALIDATION_FAILED", "x", { errors: [1, null, "name is bad"] })).fields).toEqual({ name: "Name is bad." });
    expect(mapApiError(new ApiError(400, "VALIDATION_FAILED", "x", null)).fields).toEqual({});
  });
});

describe("isFieldError", () => {
  it("is true only when a field got a message", () => {
    expect(isFieldError({ fields: { name: "x" }, general: [] })).toBe(true);
    expect(isFieldError({ fields: {}, general: ["x"] })).toBe(false);
  });
});
