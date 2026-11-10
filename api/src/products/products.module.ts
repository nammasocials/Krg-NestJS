import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { StockModule } from "../stock/stock.module";
import { ProductImageController } from "./product-image.controller";
import { ProductImageService } from "./product-image.service";
import { Product, ProductSchema } from "./product.schema";
import { ProductsController } from "./products.controller";
import { ProductsService } from "./products.service";

@Module({
  imports: [AuditModule, FilesModule, StockModule, MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }])],
  controllers: [ProductsController, ProductImageController],
  providers: [ProductsService, ProductImageService],
  exports: [MongooseModule, ProductsService],
})
export class ProductsModule {}
