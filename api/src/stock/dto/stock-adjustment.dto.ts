import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsInt, IsString, Length, Max, Min, NotEquals } from "class-validator";
import { MAX_MOVEMENT_QTY } from "../movement-rules";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** A correction: positive adds, negative removes. The reason is required. */
export class StockAdjustmentDto {
  @ApiProperty({ example: -3, minimum: -MAX_MOVEMENT_QTY, maximum: MAX_MOVEMENT_QTY, description: "Pieces to add (+) or remove (-); not 0" })
  @IsInt({ message: "quantity must be a whole number of pieces" })
  @NotEquals(0, { message: "quantity must not be 0" })
  @Min(-MAX_MOVEMENT_QTY, { message: `quantity must be at least -${MAX_MOVEMENT_QTY}` })
  @Max(MAX_MOVEMENT_QTY, { message: `quantity must be at most ${MAX_MOVEMENT_QTY}` })
  quantity!: number;

  @ApiProperty({ example: "Damaged in storage", minLength: 3, maxLength: 200, description: "Why the count is being changed" })
  @Transform(trim)
  @IsString({ message: "note is required: say why the count is changed" })
  @Length(3, 200, { message: "note must be 3 to 200 characters" })
  note!: string;
}
