import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

export const MOVEMENT_PAGE_SIZES = [10, 25, 50] as const;

/** Query string of `GET /products/:id/stock-movements`. Anything not listed here, or out of range, is a 400. */
export class ListMovementsQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ enum: MOVEMENT_PAGE_SIZES, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsIn(MOVEMENT_PAGE_SIZES, { message: `pageSize must be one of ${MOVEMENT_PAGE_SIZES.join(", ")}` })
  pageSize: number = 10;
}
