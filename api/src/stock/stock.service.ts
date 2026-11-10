import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { type ClientSession, type Model, Types } from "mongoose";
import { Product } from "../products/product.schema";
import { MAX_BALANCE, type MovementType, movementProblem } from "./movement-rules";
import { InsufficientStockError, StockLimitExceededError } from "./stock.errors";
import { StockMovement, type StockMovementDocument } from "./stock-movement.schema";

export interface ApplyStock {
  productId: string | Types.ObjectId;
  /** Signed: positive adds stock, negative removes it. */
  delta: number;
  type: MovementType;
  invoiceId?: string | Types.ObjectId;
  note?: string;
  actorId: string;
}

/**
 * The only place that changes a product's `stock.qtyOnHand`. One conditional update both checks and
 * applies the change, so two requests racing for the last units cannot both succeed and the balance
 * can never go below zero (no read-then-write gap). The movement row is written in the same transaction.
 */
@Injectable()
export class StockService {
  constructor(
    @InjectModel(Product.name) private readonly products: Model<Product>,
    @InjectModel(StockMovement.name) private readonly movements: Model<StockMovement>,
  ) {}

  /** Must be called inside the caller's transaction (`session`). Returns the movement written. */
  async apply(session: ClientSession, input: ApplyStock): Promise<StockMovementDocument> {
    const { delta, type } = input;
    const problem = movementProblem(type, delta);
    if (problem) throw new BadRequestException(problem);
    if (!Types.ObjectId.isValid(input.productId)) throw new NotFoundException("Product not found");

    const updated = await this.products.findOneAndUpdate(
      // For additions the condition is always true; for removals it is "enough on hand".
      // and the balance after the change may not pass the limit.
      { _id: input.productId, isDeleted: false, "stock.qtyOnHand": { $gte: -delta, $lte: MAX_BALANCE - delta } },
      { $inc: { "stock.qtyOnHand": delta } },
      { new: true, session },
    );

    if (!updated) {
      const product = await this.products.findOne({ _id: input.productId, isDeleted: false }, { name: 1, stock: 1 }, { session }).lean();
      if (!product) throw new NotFoundException("Product not found");
      const onHand = product.stock?.qtyOnHand ?? 0;
      if (onHand + delta > MAX_BALANCE) throw new StockLimitExceededError(product.name, onHand, MAX_BALANCE);
      throw new InsufficientStockError(product.name, onHand, -delta);
    }

    const [movement] = await this.movements.create(
      [
        {
          productId: updated._id,
          type,
          quantity: delta,
          balanceAfter: updated.stock.qtyOnHand,
          ...(input.invoiceId ? { invoiceId: new Types.ObjectId(String(input.invoiceId)) } : {}),
          ...(input.note ? { note: input.note } : {}),
          createdBy: new Types.ObjectId(input.actorId),
        },
      ],
      { session },
    );
    return movement;
  }
}
