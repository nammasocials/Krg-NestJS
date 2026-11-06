import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/decorators";
import { RequestId } from "../common/request-id.middleware";
import { CreateProductDto } from "./dto/create-product.dto";
import { ListProductsQuery } from "./dto/list-products.query";
import { ProductsService } from "./products.service";

/** Any signed-in user (ADMIN or SUPER_ADMIN) may manage products; the global guard handles sign-in. */
@ApiTags("products")
@ApiBearerAuth()
@Controller("products")
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @Get()
  @ApiOkResponse({ description: "A page of products: { items, page, pageSize, total, totalPages }." })
  list(@Query() query: ListProductsQuery) {
    return this.products.list(query);
  }

  @Post()
  @ApiCreatedResponse({ description: "The new product." })
  @ApiConflictResponse({ description: "PRODUCT_NAME_EXISTS: another product already uses this name." })
  async create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser, @RequestId() requestId: string) {
    const product = await this.products.create(dto, { id: user.id, requestId });
    return product.toJSON();
  }
}
