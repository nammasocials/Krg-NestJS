// Set before AppModule is imported: ConfigModule reads process.env when the module is created.
process.env.NODE_ENV = "test";
process.env.DB_MODE = "mock";
process.env.MOCK_DB_PATH = "";
process.env.JWT_ACCESS_SECRET = "t".repeat(40);
process.env.ARGON2_MEMORY_KIB = "1024";
process.env.ARGON2_TIME_COST = "1";
// These suites sign in many times from one address; rate limiting has its own suites.
process.env.LOGIN_IP_LIMIT = "100000";
process.env.LOGIN_FAIL_LIMIT = "100000";
process.env.SEED_ADMIN_USERNAME = "admin";
process.env.SEED_ADMIN_PASSWORD = "AdminPass#1";

import { INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { User } from "../users/user.schema";
import { INVALID_CREDENTIALS } from "./auth.service";
import { PasswordService } from "./password.service";
import { RefreshToken } from "./refresh-token.schema";
import { TokenService } from "./token.service";

describe("POST /api/v1/auth/login (mock database)", () => {
  let app: INestApplication;
  let users: Model<User>;
  let tokens: Model<RefreshToken>;
  let passwords: PasswordService;
  let verifySpy: jest.SpyInstance;

  const login = (body: object) => request(app.getHttpServer()).post("/api/v1/auth/login").send(body);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    users = app.get(getModelToken(User.name));
    tokens = app.get(getModelToken(RefreshToken.name));
    passwords = app.get(PasswordService);
    verifySpy = jest.spyOn(passwords, "verify");

    await users.create({
      username: "staff01",
      passwordHash: await passwords.hash("StaffPass#1"),
      fullName: "Staff One",
      role: "ADMIN",
    });
    await users.create({
      username: "legacy1",
      passwordHash: PasswordService.legacyHash("OldPass#1"),
      fullName: "Legacy User",
      role: "ADMIN",
    });
    await users.create({
      username: "gone01",
      passwordHash: await passwords.hash("GonePass#1"),
      fullName: "Inactive User",
      role: "ADMIN",
      isActive: false,
    });
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  describe("success", () => {
    it("returns 200 with token, expiry and user, and sets the refresh cookie", async () => {
      const res = await login({ username: "staff01", password: "StaffPass#1" }).expect(200);

      expect(res.body.code).toBe("OK");
      expect(res.body.data.expiresIn).toBe(900);
      expect(res.body.data.user).toMatchObject({ username: "staff01", fullName: "Staff One", role: "ADMIN" });
      expect(res.body.data.user.id).toMatch(/^[0-9a-f]{24}$/);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|StaffPass|refresh/i);

      const cookie = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("refresh_token="))!;
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).toContain("Path=/api/v1/auth");
      expect(cookie).toContain(`Max-Age=${7 * 86400}`);
      expect(cookie).not.toContain("Secure"); // only in production
    });

    it("issues a 15-minute JWT with sub and role", async () => {
      const res = await login({ username: "staff01", password: "StaffPass#1" });
      const claims = app.get(JwtService).verify<{ sub: string; role: string; iat: number; exp: number }>(
        res.body.data.accessToken,
      );
      expect(claims.sub).toBe(res.body.data.user.id);
      expect(claims.role).toBe("ADMIN");
      expect(claims.exp - claims.iat).toBe(900);
      expect(Object.keys(claims).sort()).toEqual(["exp", "iat", "role", "sub"]);
    });

    it("stores only the SHA-256 of a 256-bit refresh token, in a new family", async () => {
      const res = await login({ username: "staff01", password: "StaffPass#1" });
      const raw = /refresh_token=([^;]+)/.exec((res.headers["set-cookie"] as unknown as string[]).join(";"))![1];
      expect(Buffer.from(raw, "base64url")).toHaveLength(32);

      const row = await tokens.findOne({ tokenHash: TokenService.hash(raw) }).lean();
      expect(row).not.toBeNull();
      expect(row!.userId.toString()).toBe(res.body.data.user.id);
      expect(row!.revokedAt).toBeUndefined();
      expect(row!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86400_000);
      expect(await tokens.countDocuments({ tokenHash: raw })).toBe(0); // the raw value is never stored

      const other = await login({ username: "staff01", password: "StaffPass#1" });
      const otherRaw = /refresh_token=([^;]+)/.exec((other.headers["set-cookie"] as unknown as string[]).join(";"))![1];
      const otherRow = await tokens.findOne({ tokenHash: TokenService.hash(otherRaw) }).lean();
      expect(otherRow!.familyId).not.toBe(row!.familyId);
    });

    it("matches the username case-insensitively and records lastLoginAt", async () => {
      await login({ username: "STAFF01", password: "StaffPass#1" }).expect(200);
      const user = await users.findOne({ username: "staff01" }).lean();
      expect(user!.lastLoginAt).toBeInstanceOf(Date);
    });

    it("works for the seeded admin", async () => {
      const res = await login({ username: "admin", password: "AdminPass#1" }).expect(200);
      expect(res.body.data.user.role).toBe("SUPER_ADMIN");
    });

    it("upgrades a legacy SHA-512 hash to argon2id", async () => {
      await login({ username: "legacy1", password: "OldPass#1" }).expect(200);
      const user = await users.findOne({ username: "legacy1" }).select("+passwordHash").lean();
      expect(user!.passwordHash).toMatch(/^\$argon2id\$/);
      await login({ username: "legacy1", password: "OldPass#1" }).expect(200); // still works afterwards
    });
  });

  describe("failure", () => {
    const expectGeneric401 = (res: request.Response) => {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: "UNAUTHORIZED", message: INVALID_CREDENTIALS, data: null });
      expect(res.headers["set-cookie"]).toBeUndefined();
    };

    it("returns the same 401 for unknown user, wrong password and inactive user", async () => {
      const unknown = await login({ username: "nobody1", password: "whatever" });
      const wrong = await login({ username: "staff01", password: "WrongPass" });
      const inactive = await login({ username: "gone01", password: "GonePass#1" });
      [unknown, wrong, inactive].forEach(expectGeneric401);
      expect(unknown.body).toEqual(wrong.body);
      expect(wrong.body).toEqual(inactive.body);
    });

    it("verifies against a dummy hash for an unknown user instead of skipping the work", async () => {
      verifySpy.mockClear();
      await login({ username: "nobody2", password: "whatever" }).expect(401);
      expect(verifySpy).toHaveBeenCalledTimes(1);
      expect(verifySpy.mock.calls[0][1]).toMatch(/^\$argon2id\$/);
    });

    it("creates no refresh token and does not touch lastLoginAt on failure", async () => {
      const before = await tokens.countDocuments();
      await login({ username: "gone01", password: "GonePass#1" }).expect(401);
      await login({ username: "staff01", password: "nope" }).expect(401);
      expect(await tokens.countDocuments()).toBe(before);
      expect((await users.findOne({ username: "gone01" }).lean())!.lastLoginAt).toBeUndefined();
    });
  });

  describe("validation", () => {
    it.each([
      ["no body", {}],
      ["missing password", { username: "staff01" }],
      ["empty password", { username: "staff01", password: "" }],
      ["bad username shape", { username: "1abc", password: "x" }],
      ["too short username", { username: "abc", password: "x" }],
      ["unknown property", { username: "staff01", password: "x", role: "SUPER_ADMIN" }],
      ["non-string password", { username: "staff01", password: 12345 }],
    ])("rejects %s with 400 and field messages", async (_name, body) => {
      const res = await login(body).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.data.errors.length).toBeGreaterThan(0);
      expect(res.headers["set-cookie"]).toBeUndefined();
    });

    it("never echoes the submitted password back", async () => {
      const res = await login({ username: "1abc", password: "SecretValue#9" }).expect(400);
      expect(JSON.stringify(res.body)).not.toContain("SecretValue#9");
    });

    it("trims the username", async () => {
      await login({ username: "  staff01  ", password: "StaffPass#1" }).expect(200);
    });
  });
});
