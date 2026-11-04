import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER, APP_INTERCEPTOR } from "@nestjs/core";
import { LoggerModule } from "nestjs-pino";
import { HttpExceptionFilter } from "./common/http-exception.filter";
import { ResponseInterceptor } from "./common/response.interceptor";
import { AuthModule } from "./auth/auth.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { Env, validateEnv } from "./config/env.schema";
import { SeedModule } from "./seed/seed.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    SeedModule,
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const nodeEnv = config.get("NODE_ENV", { infer: true });
        return {
          pinoHttp: {
            level: nodeEnv === "test" ? "silent" : "info",
            transport:
              nodeEnv === "development"
                ? { target: "pino-pretty", options: { singleLine: true } }
                : undefined,
            // Credentials must never reach the logs.
            redact: {
              paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                'res.headers["set-cookie"]',
                "req.body.password",
              ],
              censor: "[redacted]",
            },
          },
        };
      },
    }),
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule {}
