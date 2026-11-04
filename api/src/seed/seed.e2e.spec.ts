import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import { AuthModule } from "../auth/auth.module";
import { PasswordService } from "../auth/password.service";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { User } from "../users/user.schema";
import { UsersModule } from "../users/users.module";
import { SeedModule } from "./seed.module";
import { SeedService } from "./seed.service";

const baseEnv = {
  NODE_ENV: "test",
  DB_MODE: "mock",
  MOCK_DB_PATH: "",
  JWT_ACCESS_SECRET: "x".repeat(32),
  ARGON2_MEMORY_KIB: "1024",
  ARGON2_TIME_COST: "1",
};

async function boot(extra: Record<string, string>) {
  const env = validateEnv({ ...baseEnv, ...extra });
  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
      DatabaseModule,
      UsersModule,
      AuthModule,
      SeedModule,
    ],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init(); // mock mode: the seed already ran once during bootstrap
  return app;
}

describe("admin seed (mock database)", () => {
  const apps: INestApplication[] = [];
  let out: jest.SpyInstance;

  beforeEach(() => {
    out = jest.spyOn(process.stdout, "write").mockImplementation(() => true);
  });
  afterEach(() => out.mockRestore());
  afterAll(async () => {
    await Promise.all(apps.map((a) => a.close()));
  }, 60_000);

  const printed = () => out.mock.calls.map((c) => String(c[0])).join("");

  it("uses SEED_ADMIN_PASSWORD, hashes it with argon2id and prints nothing", async () => {
    const app = await boot({ SEED_ADMIN_USERNAME: "owner1", SEED_ADMIN_PASSWORD: "ChosenPass#1" });
    apps.push(app);

    const users = app.get<Model<User>>(getModelToken(User.name));
    const all = await users.find().select("+passwordHash").lean();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ username: "owner1", role: "SUPER_ADMIN", isActive: true });
    expect(all[0].passwordHash).toMatch(/^\$argon2id\$/);
    expect((await app.get(PasswordService).verify("ChosenPass#1", all[0].passwordHash)).valid).toBe(true);
    expect(printed()).not.toContain("ChosenPass#1");
  }, 300_000);

  it("is idempotent: running again changes nothing", async () => {
    const app = apps[0];
    const users = app.get<Model<User>>(getModelToken(User.name));
    const before = await users.find().select("+passwordHash").lean();

    expect(await app.get(SeedService).run()).toEqual({ created: false });
    expect(await app.get(SeedService).run()).toEqual({ created: false });

    const after = await users.find().select("+passwordHash").lean();
    expect(after).toEqual(before);
  });

  it("generates a random password when none is configured and prints it once", async () => {
    const app = await boot({});
    apps.push(app);

    const text = printed();
    const password = /password: (\S+)/.exec(text)?.[1];
    expect(password).toBeDefined();
    expect(password!.length).toBeGreaterThanOrEqual(16);
    expect(text.match(/password:/g)).toHaveLength(1);

    const users = app.get<Model<User>>(getModelToken(User.name));
    const admin = await users.findOne({ username: "admin" }).select("+passwordHash").lean();
    expect((await app.get(PasswordService).verify(password!, admin!.passwordHash)).valid).toBe(true);

    out.mockClear();
    await app.get(SeedService).run();
    expect(printed()).toBe(""); // a second run prints nothing
  }, 300_000);
});
