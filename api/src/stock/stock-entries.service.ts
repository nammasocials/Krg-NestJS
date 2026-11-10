import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { type Connection, type Model } from "mongoose";
import { AuditService } from "../audit/audit.service";
import type { Actor } from "../customers/customers.service";
import { Product, type ProductDocument } from "../products/product.schema";
import type { MovementType } from "./movement-rules";
import type { StockMovementDocument } from "./stock-movement.schema";
import { StockService } from "./stock.service";

export interface StockEntryResult {
  product: ProductDocument;
  movement: StockMovementDocument;
}

/**
 * Stock changed by hand: goods received, or a correction. The balance change, its movement and the
 * audit row are one transaction, so either all three exist or none does.
 */
@Injectable()
export class StockEntriesService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Product.name) private readonly products: Model<Product>,
    private readonly stock: StockService,
    private readonly audit: AuditService,
  ) {}

  stockIn(productId: string, quantity: number, note: string | undefined, actor: Actor): Promise<StockEntryResult> {
    return this.enter(productId, "STOCK_IN", quantity, note, actor);
  }

  adjust(productId: string, quantity: number, note: string, actor: Actor): Promise<StockEntryResult> {
    return this.enter(productId, "ADJUSTMENT", quantity, note, actor);
  }

  private enter(productId: string, type: MovementType, delta: number, note: string | undefined, actor: Actor): Promise<StockEntryResult> {
    return this.connection.transaction(async (session) => {
      const movement = await this.stock.apply(session, { productId, delta, type, note, actorId: actor.id });
      const product = await this.products.findOne({ _id: productId, isDeleted: false }).session(session);
      if (!product) throw new NotFoundException("Product not found");
      await this.audit.record(
        {
          entity: "Product",
          entityId: product.id,
          action: "UPDATE",
          before: { stock: { qtyOnHand: movement.balanceAfter - delta } },
          after: { stock: { qtyOnHand: movement.balanceAfter }, movementId: movement.id },
          actorId: actor.id,
          requestId: actor.requestId,
        },
        session,
      );
      return { product, movement };
    });
  }
}
