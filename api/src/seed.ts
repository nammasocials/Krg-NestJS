// `pnpm db:seed`: creates the first admin in a real database (run `pnpm db:migrate` first).
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { validateEnv } from "./config/env.schema";
import { DatabaseModule } from "./database/database.module";
import { SeedModule } from "./seed/seed.module";
import { SeedService } from "./seed/seed.service";

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }), DatabaseModule, SeedModule],
})
class SeedAppModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(SeedAppModule);
  try {
    await app.get(SeedService).run();
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
