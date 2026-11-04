import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { type Connection, type Model, Types } from "mongoose";
import { AuthModule } from "../auth/auth.module";
import { RefreshToken } from "../auth/refresh-token.schema";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { DB_URI } from "../database/database.service";
import { dbNameFromUri } from "../database/db-uri";
import { runMigrations } from "../database/migrations";
import { User } from "./user.schema";
import { UsersModule } from "./users.module";
import { UsersService } from "./users.service";

const validUser = { username: "admin", passwordHash: "hash", fullName: "Admin User", role: "ADMIN" as const };

// Always the in-memory mock database; the startup runs the real migrations.
describe("users and refreshTokens (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let users: UsersService;
  let userModel: Model<User>;
  let tokenModel: Model<RefreshToken>;

  beforeAll(async () => {
    const env = validateEnv({ NODE_ENV: "test", DB_MODE: "mock", MOCK_DB_PATH: "", JWT_ACCESS_SECRET: "x".repeat(32) });
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        DatabaseModule,
        UsersModule,
        AuthModule,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    users = app.get(UsersService);
    userModel = app.get(getModelToken(User.name));
    tokenModel = app.get(getModelToken(RefreshToken.name));
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000); // stopping mongod can be slow when suites run in parallel

  describe("user schema", () => {
    it("requires username, passwordHash, fullName and role", () => {
      const err = new userModel({}).validateSync();
      expect(Object.keys(err?.errors ?? {}).sort()).toEqual(["fullName", "passwordHash", "role", "username"]);
    });

    it("only accepts the two roles", () => {
      expect(new userModel({ ...validUser, role: "OWNER" }).validateSync()?.errors.role).toBeDefined();
      expect(new userModel({ ...validUser, role: "SUPER_ADMIN" }).validateSync()).toBeUndefined();
    });

    it("applies the web form's username rule", () => {
      for (const bad of ["abc", "1admin", "has space", "toolongusername1234567"]) {
        expect(new userModel({ ...validUser, username: bad }).validateSync()?.errors.username).toBeDefined();
      }
    });

    it("defaults isActive to true and never serialises passwordHash", () => {
      const doc = new userModel(validUser);
      expect(doc.isActive).toBe(true);
      const json = JSON.parse(JSON.stringify(doc));
      expect(json.passwordHash).toBeUndefined();
      expect(json.username).toBe("admin");
    });
  });

  describe("indexes created by the migration", () => {
    it("users: unique case-insensitive username", async () => {
      const idx = (await connection.collection("users").indexes()).find((i) => i.name === "username_unique_ci");
      expect(idx).toMatchObject({ unique: true, key: { username: 1 }, collation: { locale: "en", strength: 2 } });
    });

    it("refreshTokens: unique tokenHash, TTL on expiresAt, userId and familyId", async () => {
      const idx = await connection.collection("refreshTokens").indexes();
      const by = (n: string) => idx.find((i) => i.name === n);
      expect(by("tokenHash_unique")?.unique).toBe(true);
      expect(by("expiresAt_ttl")?.expireAfterSeconds).toBe(0);
      expect(by("userId")?.key).toEqual({ userId: 1 });
      expect(by("familyId")?.key).toEqual({ familyId: 1 });
    });

    it("can run again without error (idempotent)", async () => {
      await connection.collection("migrations").deleteMany({});
      const uri = app.get<string>(DB_URI);
      const applied = await runMigrations(uri, dbNameFromUri(uri));
      expect(applied).toContain("20261103100000-create-users-and-refresh-tokens.mjs");
    });
  });

  describe("users collection behaviour", () => {
    it("rejects a username that differs only by case", async () => {
      await users.create({ ...validUser, username: "Admin1" });
      await expect(users.create({ ...validUser, username: "admin1" })).rejects.toMatchObject({ code: 11000 });
    });

    it("finds a user case-insensitively and hides the hash by default", async () => {
      const found = await users.findByUsername("ADMIN1");
      expect(found?.username).toBe("Admin1");
      expect(found?.passwordHash).toBeUndefined();
      expect((await users.findByUsername("admin1", true))?.passwordHash).toBe("hash");
    });

    it("returns null for an unknown user", async () => {
      expect(await users.findByUsername("nobody1")).toBeNull();
    });
  });

  describe("refreshTokens collection behaviour", () => {
    const token = (hash: string) => ({
      userId: new Types.ObjectId(),
      tokenHash: hash,
      familyId: "fam-1",
      expiresAt: new Date(Date.now() + 60_000),
    });

    it("rejects a duplicate tokenHash", async () => {
      await tokenModel.create(token("h1"));
      await expect(tokenModel.create(token("h1"))).rejects.toMatchObject({ code: 11000 });
    });

    it("requires the mandatory fields", () => {
      const err = new tokenModel({}).validateSync();
      expect(Object.keys(err?.errors ?? {}).sort()).toEqual(["expiresAt", "familyId", "tokenHash", "userId"]);
    });
  });
});
