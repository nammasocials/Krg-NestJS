import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiNotFoundResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { ParseObjectIdPipe } from "../common/parse-object-id.pipe";
import { ListMovementsQuery } from "./dto/list-movements.query";
import { StockHistoryService } from "./stock-history.service";

/** Any signed-in user may read a product's stock history; the global guard handles sign-in. */
@ApiTags("products")
@ApiBearerAuth()
@Controller("products/:id/stock-movements")
export class StockMovementsController {
  constructor(private readonly history: StockHistoryService) {}

  @Get()
  @ApiOkResponse({ description: "A page of movements, newest first: { items, page, pageSize, total, totalPages }." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted product." })
  list(@Param("id", ParseObjectIdPipe) id: string, @Query() query: ListMovementsQuery) {
    return this.history.list(id, query);
  }
}
