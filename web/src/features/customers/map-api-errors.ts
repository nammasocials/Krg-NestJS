import { ApiError } from "@/lib/api/client";
import type { CustomerField } from "./customer-schema";

export interface MappedErrors {
  /** A message for each form field the API complained about (first one wins). */
  fields: Partial<Record<CustomerField, string>>;
  /** Anything that does not belong to one field; show it as a toast. */
  general: string[];
}

const GSTIN_EXISTS = "GSTIN_EXISTS";
const GSTIN_EXISTS_TEXT = "A customer with this GSTIN already exists.";

const LABELS: Record<CustomerField, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  phoneAlt: "Alternate phone",
  addressLine: "Address",
  city: "City",
  pincode: "Pincode",
  gstin: "GSTIN",
};

/** The API starts each validation message with the field path; `phoneAlt` must be tried before `phone`. */
const PREFIXES: [RegExp, CustomerField][] = [
  [/^name\b/, "name"],
  [/^email\b/, "email"],
  [/^phoneAlt\b/, "phoneAlt"],
  [/^phone\b/, "phone"],
  [/^address\.line\b/, "addressLine"],
  [/^address\.city\b/, "city"],
  [/^address\.pincode\b/, "pincode"],
  [/^address\b/, "addressLine"],
  [/^gstin\b/, "gstin"],
];

function errorList(data: unknown): string[] {
  const errors = (data as { errors?: unknown } | null | undefined)?.errors;
  return Array.isArray(errors) ? errors.filter((e): e is string => typeof e === "string") : [];
}

/**
 * Turns the API's answer to a failed save into field messages. `VALIDATION_FAILED` lists messages
 * that start with the field path ("address.pincode must be …"); `GSTIN_EXISTS` belongs to the GSTIN.
 */
export function mapApiError(err: unknown): MappedErrors {
  const result: MappedErrors = { fields: {}, general: [] };
  if (!(err instanceof ApiError)) return result;

  if (err.code === GSTIN_EXISTS) {
    result.fields.gstin = GSTIN_EXISTS_TEXT;
    return result;
  }

  const messages = errorList(err.data);
  if (err.code === "VALIDATION_FAILED" && messages.length > 0) {
    for (const message of messages) {
      const hit = PREFIXES.find(([pattern]) => pattern.test(message));
      if (!hit) {
        result.general.push(message);
        continue;
      }
      const [pattern, field] = hit;
      if (result.fields[field]) continue;
      const rest = message.replace(pattern, "").trim();
      const text = rest ? `${LABELS[field]} ${rest}` : `${LABELS[field]} is not valid`;
      result.fields[field] = /[.!?]$/.test(text) ? text : `${text}.`;
    }
  }
  return result;
}

/** True when the answer was about the data (fields or a duplicate), as opposed to a server or network problem. */
export const isFieldError = (mapped: MappedErrors): boolean => Object.keys(mapped.fields).length > 0;
