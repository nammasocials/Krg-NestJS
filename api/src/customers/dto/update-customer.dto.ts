import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsOptional } from "class-validator";
import { normalizePhone } from "../phone";
import { IsIndianMobile } from "../validators";
import { CreateCustomerDto } from "./create-customer.dto";

/**
 * Any subset of the create fields, with the same rules. A sent `address` is replaced as a whole
 * (all three parts required). `phoneAlt` may be `null` or empty to remove it.
 */
export class UpdateCustomerDto extends PartialType(OmitType(CreateCustomerDto, ["phoneAlt"] as const)) {
  @ApiPropertyOptional({ example: "9123456780", nullable: true })
  @Transform(({ value }: { value: unknown }) =>
    value === "" || value === null ? null : typeof value === "string" ? (normalizePhone(value) ?? value) : value,
  )
  @IsOptional()
  @IsIndianMobile()
  phoneAlt?: string | null;
}
