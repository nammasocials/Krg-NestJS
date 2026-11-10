import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/decorators";
import { ParseObjectIdPipe } from "../common/parse-object-id.pipe";
import { RequestId } from "../common/request-id.middleware";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";
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

  @Get(":id")
  @ApiOkResponse({ description: "The product." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted id." })
  async get(@Param("id", ParseObjectIdPipe) id: string) {
    return (await this.products.get(id)).toJSON();
  }

  @Patch(":id")
  @ApiOkResponse({ description: "The updated product." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted id." })
  @ApiConflictResponse({ description: "PRODUCT_NAME_EXISTS: another product already uses this name." })
  async update(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ) {
    return (await this.products.update(id, dto, { id: user.id, requestId })).toJSON();
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Deleted (soft)." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or already deleted id." })
  async remove(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ): Promise<void> {
    await this.products.remove(id, { id: user.id, requestId });
  }
}
