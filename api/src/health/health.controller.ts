import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators";
import { DatabaseService } from "../database/database.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness and database status" })
  check() {
    return { status: "ok", db: this.database.status() };
  }
}
