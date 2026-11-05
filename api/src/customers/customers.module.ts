import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuditModule } from "../audit/audit.module";
import { FilesModule } from "../files/files.module";
import { Customer, CustomerSchema } from "./customer.schema";
import { CustomerLogoController } from "./customer-logo.controller";
import { CustomerLogoService } from "./customer-logo.service";
import { CustomersController } from "./customers.controller";
import { CustomersService } from "./customers.service";

@Module({
  imports: [AuditModule, FilesModule, MongooseModule.forFeature([{ name: Customer.name, schema: CustomerSchema }])],
  controllers: [CustomersController, CustomerLogoController],
  providers: [CustomersService, CustomerLogoService],
  exports: [MongooseModule, CustomersService],
})
export class CustomersModule {}
