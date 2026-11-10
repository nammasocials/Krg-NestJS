/** Why a product's stock changed. Fixed in code. */
export const MOVEMENT_TYPES = ["OPENING", "STOCK_IN", "SALE", "SALE_CANCEL", "ADJUSTMENT"] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const isMovementType = (value: unknown): value is MovementType =>
  typeof value === "string" && (MOVEMENT_TYPES as readonly string[]).includes(value);

/** The largest single change (and the largest opening stock) accepted. */
export const MAX_MOVEMENT_QTY = 1_000_000;

/** The most pieces one product may hold; a change that would go above it is refused. */
export const MAX_BALANCE = 100_000_000;

/** Which direction each type moves stock. An adjustment may go either way. */
const DIRECTION: Readonly<Record<MovementType, "in" | "out" | "either">> = {
  OPENING: "in",
  STOCK_IN: "in",
  SALE_CANCEL: "in",
  SALE: "out",
  ADJUSTMENT: "either",
};

/**
 * Returns a message when the quantity is not acceptable for the type, or `null` when it is fine:
 * a non-zero whole number, within the limit, positive for stock coming in and negative for a sale.
 */
export function movementProblem(type: MovementType, quantity: number): string | null {
  if (!Number.isSafeInteger(quantity)) return "quantity must be a whole number";
  if (quantity === 0) return "quantity must not be 0";
  if (Math.abs(quantity) > MAX_MOVEMENT_QTY) return `quantity must be between -${MAX_MOVEMENT_QTY} and ${MAX_MOVEMENT_QTY}`;
  const direction = DIRECTION[type];
  if (direction === "in" && quantity < 0) return `${type} must add stock (a positive quantity)`;
  if (direction === "out" && quantity > 0) return `${type} must remove stock (a negative quantity)`;
  return null;
}
