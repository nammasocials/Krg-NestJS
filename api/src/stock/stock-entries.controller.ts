import { Body, Controller, Param, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiTags } from "@nestjs/swagger";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/decorators";
import { ParseObjectIdPipe } from "../common/parse-object-id.pipe";
import { RequestId } from "../common/request-id.middleware";
import { StockAdjustmentDto } from "./dto/stock-adjustment.dto";
import { StockInDto } from "./dto/stock-in.dto";
import { StockEntriesService } from "./stock-entries.service";

/** Any signed-in user may change stock by hand; every change is recorded in the product's history. */
@ApiTags("products")
@ApiBearerAuth()
@Controller("products/:id")
export class StockEntriesController {
  constructor(private readonly entries: StockEntriesService) {}

  @Post("stock-in")
  @ApiCreatedResponse({ description: "{ product, movement }: the product with its new stock and the STOCK_IN movement." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted product." })
  @ApiConflictResponse({ description: "STOCK_LIMIT_EXCEEDED: the balance would pass 100,000,000." })
  async stockIn(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: StockInDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ) {
    const { product, movement } = await this.entries.stockIn(id, dto.quantity, dto.note, { id: user.id, requestId });
    return { product: product.toJSON(), movement: movement.toJSON() };
  }

  @Post("stock-adjustments")
  @ApiCreatedResponse({ description: "{ product, movement }: the product with its new stock and the ADJUSTMENT movement." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted product." })
  @ApiConflictResponse({ description: "INSUFFICIENT_STOCK: removing more than is on hand. STOCK_LIMIT_EXCEEDED: the balance would pass 100,000,000." })
  async adjust(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: StockAdjustmentDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ) {
    const { product, movement } = await this.entries.adjust(id, dto.quantity, dto.note, { id: user.id, requestId });
    return { product: product.toJSON(), movement: movement.toJSON() };
  }
}
