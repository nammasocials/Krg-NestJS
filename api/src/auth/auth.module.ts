import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { MongooseModule } from "@nestjs/mongoose";
import type { Env } from "../config/env.schema";
import { UsersModule } from "../users/users.module";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { LoginThrottleGuard } from "./login-throttle.guard";
import { LoginThrottleService } from "./login-throttle.service";
import { PasswordService } from "./password.service";
import { RefreshToken, RefreshTokenSchema } from "./refresh-token.schema";
import { RolesGuard } from "./roles.guard";
import { TokenService } from "./token.service";

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RefreshToken.name, schema: RefreshTokenSchema }]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => ({ secret: config.get("JWT_ACCESS_SECRET", { infer: true }) }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LoginThrottleGuard,
    LoginThrottleService,
    PasswordService,
    TokenService,
    // Global guards run in this order: authenticate first, then check roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [MongooseModule, PasswordService, TokenService],
})
export class AuthModule {}
