import { ApiError } from "@/lib/api/client";
import type { ProductField } from "./product-schema";

export interface MappedErrors {
  /** A message for each form field the API complained about (first one wins). */
  fields: Partial<Record<ProductField, string>>;
  /** Anything that does not belong to one field; show it as a toast. */
  general: string[];
}

const NAME_EXISTS = "PRODUCT_NAME_EXISTS";
const NAME_EXISTS_TEXT = "A product with this name already exists.";

const LABELS: Record<ProductField, string> = {
  name: "Name",
  unit: "Unit",
  unitPrice: "Price",
  hsnCode: "HSN code",
  gstRate: "GST rate",
  isActive: "Status",
  openingStock: "Opening stock",
};

/** The API starts each validation message with the field name. */
const PREFIXES: [RegExp, ProductField][] = [
  [/^name\b/, "name"],
  [/^unit\b/, "unit"],
  [/^unitPrice\b/, "unitPrice"],
  [/^hsnCode\b/, "hsnCode"],
  [/^gstRate\b/, "gstRate"],
  [/^isActive\b/, "isActive"],
  [/^openingStock\b/, "openingStock"],
];

function errorList(data: unknown): string[] {
  const errors = (data as { errors?: unknown } | null | undefined)?.errors;
  return Array.isArray(errors) ? errors.filter((e): e is string => typeof e === "string") : [];
}

/**
 * Turns the API's answer to a failed save into field messages. `VALIDATION_FAILED` lists messages that
 * start with the field name ("hsnCode must be …"); `PRODUCT_NAME_EXISTS` belongs to the name.
 */
export function mapApiError(err: unknown): MappedErrors {
  const result: MappedErrors = { fields: {}, general: [] };
  if (!(err instanceof ApiError)) return result;

  if (err.code === NAME_EXISTS) {
    result.fields.name = NAME_EXISTS_TEXT;
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
