import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export const PAGE_SIZES = [10, 25, 50] as const;
export const SORTS = ["name", "-name", "createdAt", "-createdAt"] as const;
export type CustomerSort = (typeof SORTS)[number];

/** Query string of `GET /customers`. Anything not listed here, or out of range, is a 400. */
export class ListCustomersQuery {
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

  @ApiPropertyOptional({ description: "Text to look for in name, email, phone and GSTIN (case-insensitive)." })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: SORTS, default: "-createdAt", description: "A leading - means descending." })
  @IsOptional()
  @IsIn(SORTS, { message: `sort must be one of ${SORTS.join(", ")}` })
  sort: CustomerSort = "-createdAt";
}
