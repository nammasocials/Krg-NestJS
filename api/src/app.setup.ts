import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type { Env } from "./config/env.schema";
import { parseTrustProxy } from "./config/trust-proxy";

/** Everything a request passes through before reaching a controller; shared by `main.ts` and the e2e tests. */
export function configureApp(app: INestApplication) {
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Behind a reverse proxy, req.ip must be the client's address (rate limiting is per IP).
  const instance = app.getHttpAdapter().getInstance() as { set(name: string, value: unknown): void };
  instance.set("trust proxy", parseTrustProxy(config.get("TRUST_PROXY", { infer: true })));

  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({ origin: config.get("CORS_ORIGIN", { infer: true }), credentials: true });
  app.setGlobalPrefix("api/v1");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
