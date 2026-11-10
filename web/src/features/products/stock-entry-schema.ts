import { z } from "zod";
import { ApiError } from "@/lib/api/client";
import type { UnitCode } from "./product.types";

/** Same limits as the API (movement-rules.ts and the stock DTOs). */
export const MAX_STOCK_CHANGE = 1_000_000;
export const MAX_STOCK_BALANCE = 100_000_000;
export const PIECES_PER_PACK = 10;
export const MAX_NOTE = 200;
export const MIN_REASON = 3;

export const ENTRY_KINDS = ["IN", "INCREASE", "DECREASE"] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];
export const ENTRY_LABELS: Record<EntryKind, string> = {
  IN: "Stock in (goods received)",
  INCREASE: "Increase by adjustment",
  DECREASE: "Decrease by adjustment",
};

export const COUNT_UNITS = ["PIECE", "PACK"] as const;
export type CountUnit = (typeof COUNT_UNITS)[number];

/** Stock-in: 1 to 1,000,000 whole pieces. */
export const isValidStockInQuantity = (n: number): boolean => Number.isInteger(n) && n >= 1 && n <= MAX_STOCK_CHANGE;
/** Adjustment: a non-zero whole number, -1,000,000 to 1,000,000. */
export const isValidAdjustmentQuantity = (n: number): boolean =>
  Number.isInteger(n) && n !== 0 && Math.abs(n) <= MAX_STOCK_CHANGE;
/** Stock-in note: optional, up to 200 characters once trimmed. */
export const isValidStockInNote = (note: string): boolean => note.trim().length <= MAX_NOTE;
/** Adjustment reason: 3 to 200 characters once trimmed. */
export const isValidReason = (note: string): boolean => {
  const n = note.trim().length;
  return n >= MIN_REASON && n <= MAX_NOTE;
};

export const piecesPerUnit = (unit: CountUnit): number => (unit === "PACK" ? PIECES_PER_PACK : 1);

/** The typed quantity as whole pieces (a pack is exactly 10), or null when it is not a whole number. */
export function toPieces(text: string, unit: CountUnit): number | null {
  const t = text.trim();
  if (!/^\d{1,9}$/.test(t)) return null;
  return Number(t) * piecesPerUnit(unit);
}

export function quantityProblem(text: string, unit: CountUnit): string | null {
  if (text.trim() === "") return "Enter the quantity.";
  const pieces = toPieces(text, unit);
  if (pieces === null) return `Enter a whole number of ${unit === "PACK" ? "packs" : "pieces"}.`;
  if (pieces < 1) return "Quantity must be at least 1.";
  if (pieces > MAX_STOCK_CHANGE) return `At most ${MAX_STOCK_CHANGE.toLocaleString("en-IN")} pieces at a time.`;
  return null;
}

export function noteProblem(kind: EntryKind, note: string): string | null {
  if (kind === "IN") return isValidStockInNote(note) ? null : `Note can be at most ${MAX_NOTE} characters.`;
  const n = note.trim().length;
  if (n === 0) return "Enter the reason for the change.";
  if (n < MIN_REASON) return `Reason must be at least ${MIN_REASON} characters.`;
  if (n > MAX_NOTE) return `Reason can be at most ${MAX_NOTE} characters.`;
  return null;
}

export const stockEntrySchema = z
  .object({
    kind: z.enum(ENTRY_KINDS),
    unit: z.enum(COUNT_UNITS),
    quantity: z.string(),
    note: z.string(),
  })
  .superRefine((v, ctx) => {
    const q = quantityProblem(v.quantity, v.unit);
    if (q) ctx.addIssue({ code: "custom", path: ["quantity"], message: q });
    const n = noteProblem(v.kind, v.note);
    if (n) ctx.addIssue({ code: "custom", path: ["note"], message: n });
  });

export type StockEntryValues = z.infer<typeof stockEntrySchema>;
export type StockEntryField = keyof StockEntryValues;

export const EMPTY_ENTRY: StockEntryValues = { kind: "IN", unit: "PIECE", quantity: "", note: "" };

export type EntryRequest =
  | { endpoint: "stock-in"; body: { quantity: number; note?: string } }
  | { endpoint: "stock-adjustments"; body: { quantity: number; note: string } };

/** Valid form values to the request: the endpoint and body, in whole pieces. */
export function toRequest(v: StockEntryValues): EntryRequest {
  const pieces = toPieces(v.quantity, v.unit) ?? 0;
  const note = v.note.trim();
  if (v.kind === "IN") return { endpoint: "stock-in", body: { quantity: pieces, ...(note ? { note } : {}) } };
  return { endpoint: "stock-adjustments", body: { quantity: v.kind === "DECREASE" ? -pieces : pieces, note } };
}

export type BalancePreview = { state: "ok"; after: number } | { state: "short"; available: number } | { state: "limit" };

/** What the balance would be after the entry, or why it would be refused. `pieces` is the unsigned amount. */
export function previewBalance(current: number, kind: EntryKind, pieces: number): BalancePreview {
  const after = kind === "DECREASE" ? current - pieces : current + pieces;
  if (after < 0) return { state: "short", available: current };
  if (after > MAX_STOCK_BALANCE) return { state: "limit" };
  return { state: "ok", after };
}

/** What the API's answer to a failed entry means for the form. */
export interface MappedEntryErrors {
  fields: Partial<Record<StockEntryField, string>>;
  general: string[];
}

const errorList = (data: unknown): string[] => {
  const errors = (data as { errors?: unknown } | null | undefined)?.errors;
  return Array.isArray(errors) ? errors.filter((e): e is string => typeof e === "string") : [];
};

export function mapStockError(err: unknown): MappedEntryErrors {
  const result: MappedEntryErrors = { fields: {}, general: [] };
  if (!(err instanceof ApiError)) return result;
  if (err.code === "INSUFFICIENT_STOCK") {
    result.fields.quantity = errorList(err.data)[0] ?? "There is not enough stock to remove this much.";
  } else if (err.code === "STOCK_LIMIT_EXCEEDED") {
    result.fields.quantity = errorList(err.data)[0] ?? "This would take the stock above the limit.";
  } else if (err.code === "VALIDATION_FAILED") {
    for (const message of errorList(err.data)) {
      const field: StockEntryField | null = /^quantity\b/.test(message) ? "quantity" : /^note\b/.test(message) ? "note" : null;
      if (!field) result.general.push(message);
      else result.fields[field] ??= /[.!?]$/.test(message) ? message : `${message}.`;
    }
  }
  return result;
}

/** Whether packs can be chosen: only for products that are counted in packs. */
export const canCountInPacks = (unit: UnitCode): boolean => unit === "PACK";
