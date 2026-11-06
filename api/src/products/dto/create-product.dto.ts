import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsIn, IsInt, IsNumber, IsString, Length, Matches, Max, Min } from "class-validator";
import { GST_RATES, type GstRate } from "../gst-rates";
import { HSN_PATTERN } from "../hsn";
import { UNIT_CODES, type UnitCode } from "../units";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);

/** Letters, digits and common punctuation; starts with a letter or digit. */
// \p{M} (combining marks) is needed for names in scripts such as Devanagari, Tamil or Kannada.
export const PRODUCT_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'()/+%-]*$/u;

/** ₹999,999,999.99 in paise: the most the web form can send (9 whole-rupee digits). */
export const MAX_UNIT_PRICE_PAISE = 99_999_999_999;

/**
 * `stock`, `isActive` and `isDeleted` are not accepted: a new product starts with nothing on hand and
 * active, and stock only changes through the stock service (E05).
 */
export class CreateProductDto {
  @ApiProperty({ example: "Basmati Rice 25kg" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  @Matches(PRODUCT_NAME_PATTERN, { message: "name may contain letters, digits and . , & ' ( ) / + % - only" })
  name!: string;

  @ApiProperty({ enum: UNIT_CODES, example: "PACK" })
  @IsIn(UNIT_CODES, { message: `unit must be one of: ${UNIT_CODES.join(", ")}` })
  unit!: UnitCode;

  @ApiProperty({ example: 125050, description: "Price per unit in paise (₹1250.50)" })
  @IsInt({ message: "unitPrice must be a whole number of paise" })
  @Min(0, { message: "unitPrice must not be negative" })
  @Max(MAX_UNIT_PRICE_PAISE, { message: "unitPrice is too large" })
  unitPrice!: number;

  @ApiProperty({ example: "10063020", description: "4, 6 or 8 digits" })
  @Transform(trim)
  @IsString()
  @Matches(HSN_PATTERN, { message: "hsnCode must be 4, 6 or 8 digits" })
  hsnCode!: string;

  @ApiProperty({ enum: GST_RATES, example: 5 })
  @IsNumber({}, { message: `gstRate must be one of: ${GST_RATES.join(", ")}` })
  @IsIn(GST_RATES, { message: `gstRate must be one of: ${GST_RATES.join(", ")}` })
  gstRate!: GstRate;
}
