import type { StockMovement } from "./product.types";

export const KIND_LABELS: Readonly<Record<StockMovement["type"], string>> = {
  OPENING: "Opening stock",
  STOCK_IN: "Stock in",
  SALE: "Sale",
  SALE_CANCEL: "Sale cancelled",
  ADJUSTMENT: "Adjustment",
};

export const kindLabel = (type: StockMovement["type"]): string => KIND_LABELS[type] ?? type;

/** "+40" or "−3" (a real minus sign), with Indian digit grouping: "+1,00,000". */
export function formatChange(quantity: number): string {
  const n = new Intl.NumberFormat("en-IN").format(Math.abs(quantity));
  return `${quantity < 0 ? "−" : "+"}${n}`;
}

export const changeClass = (quantity: number): string => (quantity < 0 ? "text-red-600" : "text-green-700");

/** Who made the change; "—" when it is not known (for example a deleted user). */
export const whoText = (movement: Pick<StockMovement, "createdBy">): string => movement.createdBy?.name?.trim() || "—";

/** The label above a note: adjustments explain themselves with a reason. */
export const noteLabel = (type: StockMovement["type"]): string => (type === "ADJUSTMENT" ? "Reason" : "Note");

const DATE_TIME = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });

/** "9 Nov 2026, 3:35 pm"; empty text for anything unreadable. */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : DATE_TIME.format(d).replace(/\bAM\b/, "am").replace(/\bPM\b/, "pm");
}
