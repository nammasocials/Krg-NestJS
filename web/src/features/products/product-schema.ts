import { z } from "zod";
import { paiseToRupees, rupeesToPaise } from "./money";
import { GST_RATES, UNIT_CODES, type Product, type ProductInput, type ProductUpdate } from "./product.types";

/** Same rules as the API (create-product.dto.ts); messages are written for the person filling the form. */
// \p{M} (combining marks) is needed for names in scripts such as Devanagari, Tamil or Kannada.
export const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'()/+%-]*$/u;
export const HSN_PATTERN = /^(?:[0-9]{4}|[0-9]{6}|[0-9]{8})$/;
export const MAX_UNIT_PRICE_PAISE = 99_999_999_999;

export const MAX_OPENING_STOCK = 1_000_000;
export const OPENING_STOCK_MESSAGE = `Enter a whole number of pieces from 0 to ${MAX_OPENING_STOCK.toLocaleString("en-IN")}.`;

/** Same rule as the API's `openingStock`: a whole number from 0 to 1,000,000. */
export const isValidOpeningStock = (n: number): boolean => Number.isInteger(n) && n >= 0 && n <= MAX_OPENING_STOCK;

export const PRICE_MESSAGE ="Enter the price in rupees, up to 2 decimals (for example 1250.50).";

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .min(2, "Name must be at least 2 characters.")
    .max(100, "Name can be at most 100 characters.")
    .regex(PRODUCT_NAME_PATTERN, "Name may contain letters, digits and . , & ' ( ) / + % - only."),
  unit: z.enum(UNIT_CODES, { error: "Choose a unit." }),
  unitPrice: z
    .string()
    .trim()
    .min(1, "Price is required.")
    .refine((v) => rupeesToPaise(v) !== null, PRICE_MESSAGE),
  hsnCode: z
    .string()
    .trim()
    .min(1, "HSN code is required.")
    .regex(HSN_PATTERN, "HSN code must be 4, 6 or 8 digits."),
  /** A select holds text; it is turned into a number in `toInput`. */
  gstRate: z
    .string()
    .min(1, "Choose a GST rate.")
    .refine((v) => (GST_RATES as readonly number[]).includes(Number(v)), "Choose a GST rate from the list."),
  isActive: z.boolean(),
  /** Text in the box; empty means 0. Only used when adding a product. */
  openingStock: z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d{1,7}$/.test(v) && isValidOpeningStock(Number(v))), OPENING_STOCK_MESSAGE),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type ProductField = keyof ProductFormValues;

export const EMPTY_VALUES: ProductFormValues = { name: "", unit: "PIECE", unitPrice: "", hsnCode: "", gstRate: "", isActive: true, openingStock: "" };

export function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    unit: product.unit,
    unitPrice: paiseToRupees(product.unitPrice),
    hsnCode: product.hsnCode,
    gstRate: String(product.gstRate),
    isActive: product.isActive,
    openingStock: "", // never edited after creation: stock changes through stock entries
  };
}

/** Form values (already valid) to the body the API expects: trimmed, price in whole paise, rate as a number. */
export function toInput(values: ProductFormValues): ProductInput {
  const opening = values.openingStock.trim() === "" ? 0 : Number(values.openingStock);
  return {
    name: values.name.trim(),
    unit: values.unit,
    unitPrice: rupeesToPaise(values.unitPrice) ?? 0,
    hsnCode: values.hsnCode.trim(),
    gstRate: Number(values.gstRate) as ProductInput["gstRate"],
    ...(opening > 0 ? { openingStock: opening } : {}),
  };
}

/** Only what differs from the saved product, for `PATCH`. An empty object means nothing to save. */
export function buildUpdate(saved: Product, values: ProductFormValues): ProductUpdate {
  const { openingStock: _ignored, ...next } = toInput(values); // stock is never part of an edit
  void _ignored;
  const changes: ProductUpdate = {};
  if (next.name !== saved.name) changes.name = next.name;
  if (next.unit !== saved.unit) changes.unit = next.unit;
  if (next.unitPrice !== saved.unitPrice) changes.unitPrice = next.unitPrice;
  if (next.hsnCode !== saved.hsnCode) changes.hsnCode = next.hsnCode;
  if (next.gstRate !== saved.gstRate) changes.gstRate = next.gstRate;
  if (values.isActive !== saved.isActive) changes.isActive = values.isActive;
  return changes;
}
