import { ConflictException } from "@nestjs/common";

export const INSUFFICIENT_STOCK = "INSUFFICIENT_STOCK";
export const STOCK_LIMIT_EXCEEDED = "STOCK_LIMIT_EXCEEDED";

/** The change would take the balance above the limit. Answered as `409 STOCK_LIMIT_EXCEEDED`. */
export class StockLimitExceededError extends ConflictException {
  constructor(productName: string, balance: number, limit: number) {
    super({
      code: STOCK_LIMIT_EXCEEDED,
      message: "Stock limit exceeded.",
      errors: [`${productName}: ${balance} in stock, the limit is ${limit}`],
    });
  }
}

/** The change would take the balance below zero. Answered as `409 INSUFFICIENT_STOCK`, naming the product. */
export class InsufficientStockError extends ConflictException {
  constructor(
    readonly productName: string,
    readonly available: number,
    readonly requested: number,
  ) {
    super({
      code: INSUFFICIENT_STOCK,
      message: "Not enough stock.",
      errors: [`${productName}: ${available} in stock, ${requested} requested`],
    });
  }
}
