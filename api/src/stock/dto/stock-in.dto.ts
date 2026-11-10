import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString, MaxLength, Max, Min } from "class-validator";
import { MAX_MOVEMENT_QTY } from "../movement-rules";

export const trimOrBlankToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== "string") return value;
  const text = value.trim();
  return text === "" ? undefined : text;
};

/** Goods arriving: a positive number of whole pieces. */
export class StockInDto {
  @ApiProperty({ example: 40, minimum: 1, maximum: MAX_MOVEMENT_QTY, description: "Pieces received" })
  @IsInt({ message: "quantity must be a whole number of pieces" })
  @Min(1, { message: "quantity must be at least 1" })
  @Max(MAX_MOVEMENT_QTY, { message: `quantity must be at most ${MAX_MOVEMENT_QTY}` })
  quantity!: number;

  @ApiPropertyOptional({ example: "Supplier delivery, bill 118", maxLength: 200 })
  @Transform(trimOrBlankToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: "note must be at most 200 characters" })
  note?: string;
}
