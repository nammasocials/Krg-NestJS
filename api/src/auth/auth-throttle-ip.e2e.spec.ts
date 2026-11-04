// Set before AppModule is imported: ConfigModule reads process.env when the module is created.
process.env.NODE_ENV = "test";
process.env.DB_MODE = "mock";
process.env.MOCK_DB_PATH = "";
process.env.JWT_ACCESS_SECRET = "t".repeat(40);
process.env.ARGON2_MEMORY_KIB = "1024";
process.env.ARGON2_TIME_COST = "1";
process.env.SEED_ADMIN_USERNAME = "admin";
process.env.SEED_ADMIN_PASSWORD = "AdminPass#1";
process.env.LOGIN_IP_LIMIT = "10";
process.env.LOGIN_IP_WINDOW_SECONDS = "60";
process.env.LOGIN_FAIL_LIMIT = "100000"; // this suite is about the per-IP limit only

import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { TOO_MANY_ATTEMPTS } from "./login-throttle.guard";

describe("login: requests per IP (mock database)", () => {
  let app: INestApplication;

  const login = (body: object = { username: "admin", password: "AdminPass#1" }) =>
    request(app.getHttpServer()).post("/api/v1/auth/login").send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  it("allows 10 login requests of any kind in a minute, then answers 429 with Retry-After", async () => {
    // successful, wrong-password and malformed requests all count
    for (let i = 0; i < 4; i++) await login().expect(200);
    for (let i = 0; i < 3; i++) await login({ username: "admin", password: "wrong" }).expect(401);
    for (let i = 0; i < 3; i++) await login({ username: "x" }).expect(400);

    const res = await login().expect(429);
    expect(res.body).toEqual({ code: "TOO_MANY_ATTEMPTS", message: TOO_MANY_ATTEMPTS, data: null });
    const retryAfter = Number(res.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(60);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("keeps refusing within the window, even for valid credentials", async () => {
    await login().expect(429);
    await login({ username: "admin", password: "wrong" }).expect(429);
  });

  it("cannot be dodged with a forged X-Forwarded-For header while the proxy is not trusted", async () => {
    await login().set("X-Forwarded-For", "203.0.113.77").expect(429);
  });

  it("does not limit other endpoints", async () => {
    await request(app.getHttpServer()).get("/api/v1/health").expect(200);
    await request(app.getHttpServer()).post("/api/v1/auth/refresh").expect(401);
    await request(app.getHttpServer()).post("/api/v1/auth/logout").expect(204);
  });
});
