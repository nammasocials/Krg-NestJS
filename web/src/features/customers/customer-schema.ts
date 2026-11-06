import { z } from "zod";
import type { Customer, CustomerInput, CustomerUpdate } from "./customer.types";
import { gstinProblem, normalizeGstin } from "./gstin";
import { normalizePhone } from "./phone";

/** Same rules as the API (create-customer.dto.ts); messages are written for the person filling the form. */
// \p{M} (combining marks) is needed for names in scripts such as Devanagari, Tamil or Kannada.
export const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'()/+-]*$/u;
export const CITY_PATTERN = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export const PHONE_MESSAGE = "Enter a 10-digit mobile number starting with 6, 7, 8 or 9 (+91 is fine).";

const phoneOk = (v: string) => normalizePhone(v) !== null;

export const customerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name can be at most 100 characters.")
    .regex(NAME_PATTERN, "Name may contain letters, digits and . , & ' ( ) / + - only."),
  email: z
    .string()
    .trim()
    .min(1, "Email is required.")
    .max(254, "Email can be at most 254 characters.")
    .pipe(z.email("Enter a valid email address.")),
  phone: z.string().trim().min(1, "Phone number is required.").refine(phoneOk, PHONE_MESSAGE),
  phoneAlt: z.string().trim().refine((v) => v === "" || phoneOk(v), PHONE_MESSAGE),
  addressLine: z
    .string()
    .trim()
    .min(1, "Address is required.")
    .max(200, "Address can be at most 200 characters."),
  city: z
    .string()
    .trim()
    .min(1, "City is required.")
    .min(2, "City must be at least 2 characters.")
    .max(60, "City can be at most 60 characters.")
    .regex(CITY_PATTERN, "City may contain letters only (spaces, dots, hyphens and apostrophes are fine)."),
  pincode: z
    .string()
    .trim()
    .min(1, "Pincode is required.")
    .regex(PINCODE_PATTERN, "Pincode must be 6 digits and not start with 0."),
  gstin: z
    .string()
    .trim()
    .min(1, "GSTIN is required.")
    .superRefine((value, ctx) => {
      const problem = gstinProblem(value);
      if (problem) ctx.addIssue({ code: "custom", message: problem });
    }),
});

/** What the form fields hold: all text, so an empty box is simply "". */
export type CustomerFormValues = z.infer<typeof customerSchema>;
export type CustomerField = keyof CustomerFormValues;

export const EMPTY_VALUES: CustomerFormValues = {
  name: "",
  email: "",
  phone: "",
  phoneAlt: "",
  addressLine: "",
  city: "",
  pincode: "",
  gstin: "",
};

export function toFormValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    phoneAlt: customer.phoneAlt ?? "",
    addressLine: customer.address.line,
    city: customer.address.city,
    pincode: customer.address.pincode,
    gstin: customer.gstin,
  };
}

/** Form values (already valid) to the body the API expects: trimmed, phones as 10 digits, GSTIN upper-case. */
export function toInput(values: CustomerFormValues): CustomerInput {
  const phoneAlt = normalizePhone(values.phoneAlt);
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: normalizePhone(values.phone) ?? values.phone.trim(),
    ...(phoneAlt ? { phoneAlt } : {}),
    address: { line: values.addressLine.trim(), city: values.city.trim(), pincode: values.pincode.trim() },
    gstin: normalizeGstin(values.gstin),
  };
}

/**
 * Only what differs from the saved customer, for `PATCH`. The address goes as a whole when any part
 * changed; `phoneAlt: null` removes the alternate phone. An empty object means nothing to save.
 */
export function buildUpdate(saved: Customer, values: CustomerFormValues): CustomerUpdate {
  const next = toInput(values);
  const changes: CustomerUpdate = {};
  if (next.name !== saved.name) changes.name = next.name;
  if (next.email !== saved.email) changes.email = next.email;
  if (next.phone !== saved.phone) changes.phone = next.phone;
  if ((next.phoneAlt ?? null) !== (saved.phoneAlt ?? null)) changes.phoneAlt = next.phoneAlt ?? null;
  const a = saved.address;
  if (next.address.line !== a.line || next.address.city !== a.city || next.address.pincode !== a.pincode) {
    changes.address = next.address;
  }
  if (next.gstin !== saved.gstin) changes.gstin = next.gstin;
  return changes;
}
