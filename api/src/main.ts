import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { configureApp } from "./app.setup";
import type { Env } from "./config/env.schema";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  app.useLogger(app.get(Logger));
  configureApp(app);
  app.enableShutdownHooks();

  if (config.get("NODE_ENV", { infer: true }) !== "production") {
    const doc = new DocumentBuilder().setTitle("Krg Invoice API").setVersion("0.1.0").addBearerAuth().build();
    SwaggerModule.setup("api/docs", app, SwaggerModule.createDocument(app, doc));
  }

  const port = config.get("PORT", { infer: true });
  await app.listen(port);
  app.get(Logger).log(`API listening on http://localhost:${port}/api/v1`);
}

void bootstrap();
