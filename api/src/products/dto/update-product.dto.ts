import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsOptional } from "class-validator";
import { CreateProductDto } from "./create-product.dto";

/**
 * Any subset of the create fields, with the same rules, plus `isActive` (the activate/deactivate switch).
 * Neither `stock` nor `openingStock` is accepted: stock only changes through the stock service.
 */
export class UpdateProductDto extends PartialType(OmitType(CreateProductDto, ["openingStock"] as const)) {
  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean({ message: "isActive must be true or false" })
  isActive?: boolean;
}
