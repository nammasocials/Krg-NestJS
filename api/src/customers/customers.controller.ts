import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ParseObjectIdPipe } from "../common/parse-object-id.pipe";
import { RequestId } from "../common/request-id.middleware";
import type { AuthUser } from "../auth/auth-user";
import { CurrentUser } from "../auth/decorators";
import { CustomersService } from "./customers.service";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { ListCustomersQuery } from "./dto/list-customers.query";

/** Any signed-in user (ADMIN or SUPER_ADMIN) may manage customers; the global guard handles sign-in. */
@ApiTags("customers")
@ApiBearerAuth()
@Controller("customers")
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @ApiOkResponse({ description: "A page of customers: { items, page, pageSize, total, totalPages }." })
  list(@Query() query: ListCustomersQuery) {
    return this.customers.list(query);
  }

  @Get(":id")
  @ApiOkResponse({ description: "The customer." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted id." })
  async get(@Param("id", ParseObjectIdPipe) id: string) {
    return (await this.customers.get(id)).toJSON();
  }

  @Patch(":id")
  @ApiOkResponse({ description: "The updated customer." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or deleted id." })
  @ApiConflictResponse({ description: "GSTIN_EXISTS: another customer already uses this GSTIN." })
  async update(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ) {
    return (await this.customers.update(id, dto, { id: user.id, requestId })).toJSON();
  }

  @Delete(":id")
  @HttpCode(204)
  @ApiNoContentResponse({ description: "Deleted (soft)." })
  @ApiNotFoundResponse({ description: "Unknown, malformed or already deleted id." })
  async remove(
    @Param("id", ParseObjectIdPipe) id: string,
    @CurrentUser() user: AuthUser,
    @RequestId() requestId: string,
  ): Promise<void> {
    await this.customers.remove(id, { id: user.id, requestId });
  }

  @Post()
  @ApiCreatedResponse({ description: "The new customer." })
  @ApiConflictResponse({ description: "GSTIN_EXISTS: another customer already uses this GSTIN." })
  async create(@Body() dto: CreateCustomerDto, @CurrentUser() user: AuthUser, @RequestId() requestId: string) {
    const customer = await this.customers.create(dto, { id: user.id, requestId });
    return customer.toJSON();
  }
}
