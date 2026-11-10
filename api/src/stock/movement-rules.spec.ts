import { isMovementType, MAX_MOVEMENT_QTY, MOVEMENT_TYPES, movementProblem, type MovementType } from "./movement-rules";

describe("movementProblem", () => {
  it.each<[MovementType, number]>([
    ["OPENING", 25],
    ["STOCK_IN", 1],
    ["SALE_CANCEL", 3],
    ["SALE", -4],
    ["ADJUSTMENT", 7],
    ["ADJUSTMENT", -7],
    ["STOCK_IN", MAX_MOVEMENT_QTY],
    ["SALE", -MAX_MOVEMENT_QTY],
  ])("accepts %s with %d", (type, qty) => {
    expect(movementProblem(type, qty)).toBeNull();
  });

  it.each<[MovementType, number]>([
    ["OPENING", -1],
    ["STOCK_IN", -5],
    ["SALE_CANCEL", -2],
    ["SALE", 2],
  ])("refuses %s with the wrong sign (%d)", (type, qty) => {
    expect(movementProblem(type, qty)).toMatch(/must (add|remove) stock/);
  });

  it("refuses zero, fractions, NaN, infinity and huge amounts for every type", () => {
    for (const type of MOVEMENT_TYPES) {
      expect(movementProblem(type, 0)).toBe("quantity must not be 0");
      for (const bad of [1.5, -0.5, Number.NaN, Infinity, -Infinity]) expect(movementProblem(type, bad)).toBe("quantity must be a whole number");
    }
    expect(movementProblem("ADJUSTMENT", MAX_MOVEMENT_QTY + 1)).toMatch(/between/);
    expect(movementProblem("ADJUSTMENT", -MAX_MOVEMENT_QTY - 1)).toMatch(/between/);
  });
});

describe("isMovementType", () => {
  it("knows the five types", () => {
    for (const t of MOVEMENT_TYPES) expect(isMovementType(t)).toBe(true);
    for (const bad of ["sale", "REFUND", "", null, 3]) expect(isMovementType(bad)).toBe(false);
  });
});
