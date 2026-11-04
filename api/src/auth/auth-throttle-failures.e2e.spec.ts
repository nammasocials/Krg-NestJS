// Set before AppModule is imported: ConfigModule reads process.env when the module is created.
process.env.NODE_ENV = "test";
process.env.DB_MODE = "mock";
process.env.MOCK_DB_PATH = "";
process.env.JWT_ACCESS_SECRET = "t".repeat(40);
process.env.ARGON2_MEMORY_KIB = "1024";
process.env.ARGON2_TIME_COST = "1";
process.env.SEED_ADMIN_PASSWORD = "AdminPass#1";
process.env.LOGIN_IP_LIMIT = "100000"; // this suite is about the failed-login limit only
process.env.LOGIN_FAIL_LIMIT = "5";
process.env.LOGIN_FAIL_WINDOW_SECONDS = "900";

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { User } from "../users/user.schema";
import { TOO_MANY_ATTEMPTS } from "./login-throttle.guard";
import { PasswordService } from "./password.service";

describe("login: failed-attempt limit per username + IP (mock database)", () => {
  let app: INestApplication;

  const login = (username: string, password: string) =>
    request(app.getHttpServer()).post("/api/v1/auth/login").send({ username, password });
  const fail = (username: string, times: number) =>
    Promise.all(Array.from({ length: times }, () => login(username, "wrong-password")));
  const failInOrder = async (username: string, times: number) => {
    for (let i = 0; i < times; i++) await login(username, "wrong-password").expect(401);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    const users = app.get<Model<User>>(getModelToken(User.name));
    const hash = await app.get(PasswordService).hash("GoodPass#1");
    for (const username of ["lock001", "reset01", "other01", "case001", "valid01", "inact01"]) {
      await users.create({ username, passwordHash: hash, fullName: username, role: "ADMIN", isActive: username !== "inact01" });
    }
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  it("allows five failures, then answers 429 even with the correct password", async () => {
    await failInOrder("lock001", 5);

    const locked = await login("lock001", "GoodPass#1").expect(429);
    expect(locked.body).toEqual({ code: "TOO_MANY_ATTEMPTS", message: TOO_MANY_ATTEMPTS, data: null });
    expect(locked.headers["set-cookie"]).toBeUndefined();

    const retryAfter = Number(locked.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(890);
    expect(retryAfter).toBeLessThanOrEqual(900);

    await login("lock001", "GoodPass#1").expect(429); // still locked on the next try
  });

  it("a successful login resets the counter", async () => {
    await failInOrder("reset01", 4);
    await login("reset01", "GoodPass#1").expect(200);
    await failInOrder("reset01", 4); // would have been locked without the reset
    await login("reset01", "GoodPass#1").expect(200);
  });

  it("one locked username does not affect another from the same address", async () => {
    await login("lock001", "GoodPass#1").expect(429);
    await login("other01", "GoodPass#1").expect(200);
  });

  it("treats the username case-insensitively", async () => {
    await failInOrder("case001", 3);
    await failInOrder("CASE001", 2);
    await login("Case001", "GoodPass#1").expect(429);
  });

  it("locks unknown usernames the same way, so a lock reveals nothing about which accounts exist", async () => {
    await failInOrder("nouser1", 5);
    const res = await login("nouser1", "anything").expect(429);
    expect(res.body.message).toBe(TOO_MANY_ATTEMPTS);
  });

  it("counts failures for inactive accounts too", async () => {
    await failInOrder("inact01", 5);
    await login("inact01", "GoodPass#1").expect(429);
  });

  it("counts attempts when they arrive: a burst of parallel guesses cannot outrun the limit", async () => {
    const results = await fail("burst01", 12);
    const statuses = results.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 401)).toHaveLength(5);
    expect(statuses.filter((s) => s === 429)).toHaveLength(7);
    await login("burst01", "GoodPass#1").expect(429);
  });

  it("counts requests rejected by validation as attempts, so malformed guesses are not free", async () => {
    for (let i = 0; i < 5; i++) {
      await request(app.getHttpServer()).post("/api/v1/auth/login").send({ username: "valid01", password: "" }).expect(400);
    }
    await login("valid01", "GoodPass#1").expect(429);
  });
});
