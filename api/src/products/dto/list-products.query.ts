import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const PAGE_SIZES = [10, 25, 50] as const;
export const SORTS = ["name", "-name", "unitPrice", "-unitPrice", "createdAt", "-createdAt"] as const;
export type ProductSort = (typeof SORTS)[number];
export const ACTIVE_FILTERS = ["all", "true", "false"] as const;
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];

/** Query string of `GET /products`. Anything not listed here, or out of range, is a 400. */
export class ListProductsQuery {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  page: number = 1;

  @ApiPropertyOptional({ enum: PAGE_SIZES, default: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsIn(PAGE_SIZES, { message: `pageSize must be one of ${PAGE_SIZES.join(", ")}` })
  pageSize: number = 10;

  @ApiPropertyOptional({ description: "Text to look for in name and HSN code (case-insensitive)." })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: SORTS, default: "-createdAt", description: "A leading - means descending." })
  @IsOptional()
  @IsIn(SORTS, { message: `sort must be one of ${SORTS.join(", ")}` })
  sort: ProductSort = "-createdAt";

  @ApiPropertyOptional({ enum: ACTIVE_FILTERS, default: "all", description: "Only active, only inactive, or both." })
  @IsOptional()
  @IsIn(ACTIVE_FILTERS, { message: `active must be one of ${ACTIVE_FILTERS.join(", ")}` })
  active: ActiveFilter = "all";
}
