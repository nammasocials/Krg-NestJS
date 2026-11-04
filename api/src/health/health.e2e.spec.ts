import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { ResponseInterceptor } from "../common/response.interceptor";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { HealthModule } from "./health.module";

// Always the mock database, in memory, whatever .env says. First run downloads the MongoDB binary.
describe("GET /health (mock database)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const env = validateEnv({
      NODE_ENV: "test",
      DB_MODE: "mock",
      MOCK_DB_PATH: "",
      JWT_ACCESS_SECRET: "x".repeat(32),
    });
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, HealthModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000); // stopping mongod can be slow when suites run in parallel

  it("reports a connected mock replica set with transactions", async () => {
    const res = await request(app.getHttpServer()).get("/health").expect(200);
    expect(res.body.data.db).toEqual({ mode: "mock", connected: true, transactions: true });
  });
});
