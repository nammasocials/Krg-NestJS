import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditModule } from "../audit/audit.module";
import { Product, ProductSchema } from "../products/product.schema";
import { StockEntriesController } from "./stock-entries.controller";
import { StockEntriesService } from "./stock-entries.service";
import { User, UserSchema } from "../users/user.schema";
import { StockHistoryService } from "./stock-history.service";
import { StockMovement, StockMovementSchema } from "./stock-movement.schema";
import { StockMovementsController } from "./stock-movements.controller";
import { StockService } from "./stock.service";

/**
 * Stock history and `StockService`, the only writer of `stock.qtyOnHand`. It registers the product
 * model itself (it does not import `ProductsModule`), so products, and later invoices, can import this
 * module without a circle.
 */
@Module({
  imports: [
    AuditModule,
    MongooseModule.forFeature([
      { name: StockMovement.name, schema: StockMovementSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [StockMovementsController, StockEntriesController],
  providers: [StockService, StockHistoryService, StockEntriesService],
  exports: [MongooseModule, StockService],
})
export class StockModule {}
