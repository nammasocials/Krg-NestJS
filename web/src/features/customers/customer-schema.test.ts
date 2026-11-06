import { describe, expect, it } from "vitest";
import type { Customer } from "./customer.types";
import {
  EMPTY_VALUES,
  PHONE_MESSAGE,
  buildUpdate,
  customerSchema,
  toFormValues,
  toInput,
  type CustomerFormValues,
} from "./customer-schema";
import { GSTIN_CHECK_MESSAGE, GSTIN_FORMAT_MESSAGE, GSTIN_STATE_MESSAGE, gstinCheckChar } from "./gstin";

const valid: CustomerFormValues = {
  name: "Sri Lakshmi Traders",
  email: "accounts@example.com",
  phone: "9876543210",
  phoneAlt: "",
  addressLine: "12 Market Road",
  city: "Mysuru",
  pincode: "570001",
  gstin: "27AAPFU0939F1ZV",
};

/** The first message for a field, or null when the values are valid for it. */
function messageFor(over: Partial<CustomerFormValues>, field: keyof CustomerFormValues): string | null {
  const result = customerSchema.safeParse({ ...valid, ...over });
  if (result.success) return null;
  return result.error.issues.find((i) => i.path[0] === field)?.message ?? null;
}

describe("customerSchema", () => {
  it("accepts a complete, valid customer", () => {
    expect(customerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts an alternate phone, +91 numbers and other usual names", () => {
    expect(customerSchema.safeParse({ ...valid, phoneAlt: "+91 91234 56789", phone: "098765-43210" }).success).toBe(true);
    for (const name of ["Blue Star (India) & Co.", "A1 Traders", "M/s Rao + Sons", "L'Oréal India", "श्री गणेश"]) {
      expect(messageFor({ name }, "name")).toBeNull();
    }
  });

  it("reports every empty required field", () => {
    const result = customerSchema.safeParse(EMPTY_VALUES);
    expect(result.success).toBe(false);
    const fields = new Set(result.error?.issues.map((i) => i.path[0]));
    expect([...fields].sort()).toEqual(["addressLine", "city", "email", "gstin", "name", "phone", "pincode"]);
  });

  it.each([
    ["name too short", { name: "A" }, "name"],
    ["name too long", { name: "A".repeat(101) }, "name"],
    ["name starting with a symbol", { name: "-Acme" }, "name"],
    ["name with @", { name: "Acme @ Home" }, "name"],
    ["name of spaces", { name: "   " }, "name"],
    ["email without @", { email: "nope" }, "email"],
    ["email without domain", { email: "a@" }, "email"],
    ["email too long", { email: `${"a".repeat(250)}@x.com` }, "email"],
    ["phone too short", { phone: "12345" }, "phone"],
    ["phone starting with 5", { phone: "5876543210" }, "phone"],
    ["alternate phone invalid", { phoneAlt: "12345" }, "phoneAlt"],
    ["address too long", { addressLine: "x".repeat(201) }, "addressLine"],
    ["address of spaces", { addressLine: "   " }, "addressLine"],
    ["city with a digit", { city: "Mysuru1" }, "city"],
    ["city too short", { city: "M" }, "city"],
    ["pincode starting with 0", { pincode: "012345" }, "pincode"],
    ["pincode with 5 digits", { pincode: "57000" }, "pincode"],
    ["pincode with a letter", { pincode: "57000A" }, "pincode"],
  ] as const)("rejects %s", (_label, over, field) => {
    expect(messageFor(over, field)).toBeTruthy();
  });

  it("uses the same wording as the helpers for the alternate-phone and phone messages", () => {
    expect(messageFor({ phone: "12345" }, "phone")).toBe(PHONE_MESSAGE);
    expect(messageFor({ phoneAlt: "12345" }, "phoneAlt")).toBe(PHONE_MESSAGE);
  });

  it("explains the three different GSTIN problems", () => {
    expect(messageFor({ gstin: "27AAPFU0939F1Z" }, "gstin")).toBe(GSTIN_FORMAT_MESSAGE);
    const unknownState = `25AAPFU0939F1Z${gstinCheckChar("25AAPFU0939F1Z")}`;
    expect(messageFor({ gstin: unknownState }, "gstin")).toBe(GSTIN_STATE_MESSAGE);
    expect(messageFor({ gstin: "27AAPFU0939F1ZX" }, "gstin")).toBe(GSTIN_CHECK_MESSAGE);
    expect(messageFor({ gstin: "27aapfu0939f1zv" }, "gstin")).toBeNull(); // lower case is fixed, not refused
  });
});

describe("toInput", () => {
  it("trims, lower-cases the email, normalises phones and upper-cases the GSTIN", () => {
    expect(
      toInput({
        name: "  Acme  ",
        email: " ACME@Example.COM ",
        phone: "+91 98765-43210",
        phoneAlt: " 91234 56789 ",
        addressLine: " 1 Road ",
        city: " Hubli ",
        pincode: " 580020 ",
        gstin: " 27aapfu0939f1zv ",
      }),
    ).toEqual({
      name: "Acme",
      email: "acme@example.com",
      phone: "9876543210",
      phoneAlt: "9123456789",
      address: { line: "1 Road", city: "Hubli", pincode: "580020" },
      gstin: "27AAPFU0939F1ZV",
    });
  });

  it("leaves the alternate phone out when blank", () => {
    expect(toInput(valid)).not.toHaveProperty("phoneAlt");
  });
});

describe("buildUpdate", () => {
  const saved: Customer = {
    id: "c1",
    name: "Sri Lakshmi Traders",
    email: "accounts@example.com",
    phone: "9876543210",
    phoneAlt: "9123456789",
    address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
    gstin: "27AAPFU0939F1ZV",
    stateCode: "27",
    isDeleted: false,
    createdAt: "2026-11-05T00:00:00.000Z",
    updatedAt: "2026-11-05T00:00:00.000Z",
  };

  it("round-trips: unchanged form values give an empty update", () => {
    expect(buildUpdate(saved, toFormValues(saved))).toEqual({});
  });

  it("ignores changes that normalise to the same thing", () => {
    const values = { ...toFormValues(saved), name: " Sri Lakshmi Traders ", phone: "+91 98765 43210", gstin: "27aapfu0939f1zv" };
    expect(buildUpdate(saved, values)).toEqual({});
  });

  it("sends only the fields that changed", () => {
    const values = { ...toFormValues(saved), name: "New Name", email: "new@example.com" };
    expect(buildUpdate(saved, values)).toEqual({ name: "New Name", email: "new@example.com" });
  });

  it("sends the whole address when one part changed", () => {
    const values = { ...toFormValues(saved), city: "Hubli" };
    expect(buildUpdate(saved, values)).toEqual({ address: { line: "12 Market Road", city: "Hubli", pincode: "570001" } });
  });

  it("sends null to remove the alternate phone, and a number to add or change it", () => {
    expect(buildUpdate(saved, { ...toFormValues(saved), phoneAlt: "" })).toEqual({ phoneAlt: null });
    expect(buildUpdate(saved, { ...toFormValues(saved), phoneAlt: "9000011111" })).toEqual({ phoneAlt: "9000011111" });
    const without = { ...saved, phoneAlt: undefined };
    expect(buildUpdate(without, toFormValues(without))).toEqual({});
    expect(buildUpdate(without, { ...toFormValues(without), phoneAlt: "9000011111" })).toEqual({ phoneAlt: "9000011111" });
  });

  it("sends a new GSTIN in its normal form", () => {
    expect(buildUpdate(saved, { ...toFormValues(saved), gstin: "29aapfu0939f1zr" })).toEqual({ gstin: "29AAPFU0939F1ZR" });
  });
});
