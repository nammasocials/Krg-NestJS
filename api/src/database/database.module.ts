import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import type { Env } from "../config/env.schema";
import { DB_URI, DatabaseService } from "./database.service";
import { dbNameFromUri } from "./db-uri";
import { MockMongoModule } from "./mock-mongo.module";
import { MockMongoService } from "./mock-mongo.service";

/**
 * The single place that decides which MongoDB the app talks to (DB_MODE).
 * Nothing else in the code base knows whether the database is mock or real.
 */
@Global()
@Module({
  imports: [
    MockMongoModule,
    MongooseModule.forRootAsync({
      imports: [MockMongoModule],
      inject: [ConfigService, MockMongoService],
      useFactory: async (config: ConfigService<Env, true>, mock: MockMongoService) => {
        const uri = await resolveUri(config, mock);
        return {
          uri,
          dbName: dbNameFromUri(uri),
          serverSelectionTimeoutMS: 5000,
          autoIndex: false, // indexes come from migrations, never from app startup
          retryAttempts: 1,
          retryDelay: 500,
        };
      },
    }),
  ],
  providers: [
    {
      provide: DB_URI,
      inject: [ConfigService, MockMongoService],
      useFactory: (config: ConfigService<Env, true>, mock: MockMongoService) => resolveUri(config, mock),
    },
    DatabaseService,
  ],
  exports: [DatabaseService],
})
export class DatabaseModule {}

/** Mock mode starts the in-process server on first use; real mode just returns the configured URI. */
function resolveUri(config: ConfigService<Env, true>, mock: MockMongoService): Promise<string> {
  return config.get("DB_MODE", { infer: true }) === "mock"
    ? mock.start(
        config.get("MOCK_DB_PATH", { infer: true }),
        config.get("MOCK_DB_PORT", { infer: true }),
        config.get("MOCK_DB_VERSION", { infer: true }),
      )
    : Promise.resolve(config.get("MONGODB_URI", { infer: true })!);
}
