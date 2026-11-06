/** The ways a product is counted. Fixed in code (the old system kept them in a constants table). */
export const UNIT_CODES = ["PIECE", "PACK"] as const;
export type UnitCode = (typeof UNIT_CODES)[number];

export interface UnitInfo {
  name: string;
  plural: string;
  short: string;
  shortPlural: string;
  /** How many pieces one of this unit holds. */
  baseQty: number;
}

export const UNITS: Readonly<Record<UnitCode, UnitInfo>> = {
  PIECE: { name: "Piece", plural: "Pieces", short: "pc", shortPlural: "pcs", baseQty: 1 },
  PACK: { name: "Pack", plural: "Packs", short: "pk", shortPlural: "pks", baseQty: 10 },
};

export const isUnit = (value: unknown): value is UnitCode =>
  typeof value === "string" && (UNIT_CODES as readonly string[]).includes(value);

/** "1 Piece", "5 Packs (pks)": the wording used on screens and, later, on invoices. */
export function unitQuantityLabel(unit: UnitCode, quantity: number): string {
  const u = UNITS[unit];
  return quantity === 1 ? `1 ${u.name} (${u.short})` : `${quantity} ${u.plural} (${u.shortPlural})`;
}
