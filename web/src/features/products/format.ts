import type { GstRate, UnitCode } from "./product.types";

export { formatDate } from "@/features/customers/format";

const RUPEES = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 125050 paise becomes "₹1,250.50" (Indian digit grouping). Anything that is not a whole number gives "". */
export function formatRupees(paise: number): string {
  if (!Number.isSafeInteger(paise)) return "";
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const rest = abs % 100;
  // Built from whole rupees and paise so a large amount never passes through a floating-point division.
  return `${sign}₹${RUPEES.format(rupees).replace(/\.00$/, "")}.${String(rest).padStart(2, "0")}`;
}

export const UNIT_LABELS: Readonly<Record<UnitCode, { name: string; short: string }>> = {
  PIECE: { name: "Piece", short: "pc" },
  PACK: { name: "Pack (10 pieces)", short: "pk" },
};

export const unitName = (unit: UnitCode): string => UNIT_LABELS[unit]?.name ?? unit;

/** 0.25 becomes "0.25%", 18 becomes "18%". */
export const formatGstRate = (rate: GstRate | number): string => `${rate}%`;

/** Stock is always counted in pieces: "0 pcs", "1 pc", "1,250 pcs". */
export function formatStock(qty: number): string {
  const n = new Intl.NumberFormat("en-IN").format(qty);
  return `${n} ${qty === 1 ? "pc" : "pcs"}`;
}
