import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { IsEmail, IsObject, IsOptional, IsString, Length, Matches, MaxLength, ValidateNested } from "class-validator";
import { normalizeGstin } from "../gstin";
import { normalizePhone } from "../phone";
import { IsGstin, IsIndianMobile } from "../validators";

const trim = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim() : value);
const trimLower = ({ value }: { value: unknown }) => (typeof value === "string" ? value.trim().toLowerCase() : value);
/** A valid number becomes its 10 digits; anything else is left as sent so the validator reports it. */
const phoneDigits = ({ value }: { value: unknown }) =>
  typeof value === "string" ? (normalizePhone(value) ?? value) : value;
const gstin = ({ value }: { value: unknown }) => (typeof value === "string" ? normalizeGstin(value) : value);

/** Letters, digits and common punctuation; starts with a letter or digit. */
// \p{M} (combining marks) is needed for names in scripts such as Devanagari, Tamil or Kannada.
export const NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} .,&'()/+-]*$/u;
export const CITY_PATTERN = /^[\p{L}][\p{L}\p{M} .'-]*$/u;
export const PINCODE_PATTERN = /^[1-9][0-9]{5}$/;

export class AddressDto {
  @ApiProperty({ example: "12 Market Road" })
  @Transform(trim)
  @IsString()
  @Length(1, 200)
  line!: string;

  @ApiProperty({ example: "Mysuru" })
  @Transform(trim)
  @IsString()
  @Length(2, 60)
  @Matches(CITY_PATTERN, { message: "city must contain letters only (spaces, dots, hyphens and apostrophes allowed)" })
  city!: string;

  @ApiProperty({ example: "570001" })
  @Transform(trim)
  @IsString()
  @Matches(PINCODE_PATTERN, { message: "pincode must be 6 digits and not start with 0" })
  pincode!: string;
}

/** Rules are shared with the web form (T029). `stateCode` is not accepted: it comes from the GSTIN. */
export class CreateCustomerDto {
  @ApiProperty({ example: "Sri Lakshmi Traders" })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  @Matches(NAME_PATTERN, { message: "name may contain letters, digits and . , & ' ( ) / + - only" })
  name!: string;

  @ApiProperty({ example: "accounts@example.com" })
  @Transform(trimLower)
  @IsEmail({}, { message: "email must be a valid email address" })
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: "9876543210" })
  @Transform(phoneDigits)
  @IsIndianMobile()
  phone!: string;

  @ApiPropertyOptional({ example: "9123456780" })
  @Transform(({ value }: { value: unknown }) => (value === "" || value === null ? undefined : phoneDigits({ value })))
  @IsOptional()
  @IsIndianMobile()
  phoneAlt?: string;

  @ApiProperty({ type: AddressDto })
  @IsObject({ message: "address is required" })
  @ValidateNested()
  @Type(() => AddressDto)
  address!: AddressDto;

  @ApiProperty({ example: "27AAPFU0939F1ZV" })
  @Transform(gstin)
  @IsGstin()
  gstin!: string;
}
