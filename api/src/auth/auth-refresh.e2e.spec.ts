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
import { INVALID_SESSION } from "./auth.service";
import { PasswordService } from "./password.service";
import { RefreshToken } from "./refresh-token.schema";
import { TokenService } from "./token.service";

describe("POST /api/v1/auth/refresh and /logout (mock database)", () => {
  let app: INestApplication;
  let users: Model<User>;
  let tokens: Model<RefreshToken>;

  const http = () => request(app.getHttpServer());
  const cookieValue = (res: request.Response): string => {
    const header = (res.headers["set-cookie"] as unknown as string[] | undefined)?.find((c) => c.startsWith("refresh_token="));
    return /refresh_token=([^;]*)/.exec(header ?? "")![1];
  };
  const refresh = (raw?: string) => {
    const req = http().post("/api/v1/auth/refresh");
    return raw === undefined ? req : req.set("Cookie", `refresh_token=${raw}`);
  };
  const logout = (raw?: string) => {
    const req = http().post("/api/v1/auth/logout");
    return raw === undefined ? req : req.set("Cookie", `refresh_token=${raw}`);
  };
  /** A fresh login; returns the raw refresh token and the response. */
  const signIn = async (username = "staff02", password = "StaffPass#2") => {
    const res = await http().post("/api/v1/auth/login").send({ username, password }).expect(200);
    return { raw: cookieValue(res), res };
  };
  const row = (raw: string) => tokens.findOne({ tokenHash: TokenService.hash(raw) }).lean();
  const expectCleared = (res: request.Response) => {
    const header = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("refresh_token="))!;
    expect(header).toMatch(/^refresh_token=;/);
    expect(header).toContain("Path=/api/v1/auth");
    expect(header).toMatch(/Expires=Thu, 01 Jan 1970/);
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    users = app.get(getModelToken(User.name));
    tokens = app.get(getModelToken(RefreshToken.name));
    const passwords = app.get(PasswordService);
    await users.create({
      username: "staff02",
      passwordHash: await passwords.hash("StaffPass#2"),
      fullName: "Staff Two",
      role: "ADMIN",
    });
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  describe("refresh", () => {
    it("rotates: new access token, new cookie, old token revoked and linked, same family", async () => {
      const { raw: first } = await signIn();
      const res = await refresh(first).expect(200);

      expect(res.body.data.user).toMatchObject({ username: "staff02", role: "ADMIN" });
      expect(res.body.data.expiresIn).toBe(900);
      const claims = app.get(JwtService).verify<{ sub: string; role: string }>(res.body.data.accessToken);
      expect(claims).toMatchObject({ sub: res.body.data.user.id, role: "ADMIN" });

      const second = cookieValue(res);
      expect(second).not.toBe(first);
      const header = (res.headers["set-cookie"] as unknown as string[]).find((c) => c.startsWith("refresh_token="))!;
      expect(header).toContain("HttpOnly");
      expect(header).toContain("Path=/api/v1/auth");

      const oldRow = (await row(first))!;
      const newRow = (await row(second))!;
      expect(oldRow.revokedAt).toBeInstanceOf(Date);
      expect(oldRow.replacedBy?.toString()).toBe(newRow._id.toString());
      expect(newRow.familyId).toBe(oldRow.familyId);
      expect(newRow.revokedAt).toBeUndefined();
      expect(newRow.expiresAt.getTime()).toBeGreaterThan(Date.now() + 6 * 86400_000);
    });

    it("keeps working along the chain", async () => {
      let { raw } = await signIn();
      for (let i = 0; i < 3; i++) {
        const res = await refresh(raw).expect(200);
        raw = cookieValue(res);
      }
      expect((await row(raw))!.revokedAt).toBeUndefined();
    });

    it("picks up a changed role", async () => {
      const { raw } = await signIn();
      await users.updateOne({ username: "staff02" }, { role: "SUPER_ADMIN" });
      const res = await refresh(raw).expect(200);
      expect(res.body.data.user.role).toBe("SUPER_ADMIN");
      await users.updateOne({ username: "staff02" }, { role: "ADMIN" });
    });

    it("replaying a used token revokes the whole family", async () => {
      const { raw: first } = await signIn();
      const second = cookieValue(await refresh(first).expect(200));
      const third = cookieValue(await refresh(second).expect(200));

      const replay = await refresh(first).expect(401); // an old token shows up again: treat as stolen
      expect(replay.body).toEqual({ code: "UNAUTHORIZED", message: INVALID_SESSION, data: null });
      expectCleared(replay);

      expect((await row(third))!.revokedAt).toBeInstanceOf(Date); // the newest one is dead too
      await refresh(third).expect(401);
    });

    it("leaves other sessions of the same user alone", async () => {
      const phone = await signIn();
      const laptop = await signIn();
      const phone2 = cookieValue(await refresh(phone.raw).expect(200));
      await refresh(phone.raw).expect(401); // replay on the phone family

      await refresh(phone2).expect(401);
      const laptopNext = await refresh(laptop.raw).expect(200);
      expect(laptopNext.body.data.accessToken).toBeDefined();
    });

    it("lets exactly one of two simultaneous refreshes win", async () => {
      const { raw } = await signIn();
      const [a, b] = await Promise.all([refresh(raw), refresh(raw)]);
      expect([a.status, b.status].sort()).toEqual([200, 401]);
    });

    it("rejects a missing cookie and clears it", async () => {
      const res = await refresh().expect(401);
      expect(res.body.message).toBe(INVALID_SESSION);
      expectCleared(res);
    });

    it("rejects an unknown token and clears the cookie", async () => {
      const res = await refresh("A".repeat(43)).expect(401);
      expectCleared(res);
    });

    it("rejects an expired token without treating it as theft", async () => {
      const { raw } = await signIn();
      await tokens.updateOne({ tokenHash: TokenService.hash(raw) }, { expiresAt: new Date(Date.now() - 1000) });
      const res = await refresh(raw).expect(401);
      expectCleared(res);
      expect((await row(raw))!.revokedAt).toBeUndefined();
    });

    it("refuses and revokes the family when the user has been deactivated", async () => {
      const { raw } = await signIn();
      await users.updateOne({ username: "staff02" }, { isActive: false });
      const res = await refresh(raw).expect(401);
      expectCleared(res);
      expect((await row(raw))!.revokedAt).toBeInstanceOf(Date);

      await users.updateOne({ username: "staff02" }, { isActive: true });
      await refresh(raw).expect(401); // still dead after reactivation: the user signs in again
    });

    it("refuses when the user no longer exists", async () => {
      await users.create({
        username: "temp001",
        passwordHash: await app.get(PasswordService).hash("TempPass#1"),
        fullName: "Temp",
        role: "ADMIN",
      });
      const { raw } = await signIn("temp001", "TempPass#1");
      await users.deleteOne({ username: "temp001" });
      await refresh(raw).expect(401);
    });

    it("does not accept an access token or junk in place of the refresh token", async () => {
      const { res } = await signIn();
      await refresh(res.body.data.accessToken).expect(401);
      await refresh("not a token!").expect(401);
    });
  });

  describe("logout", () => {
    it("revokes the family, clears the cookie and answers 204", async () => {
      const { raw: first } = await signIn();
      const current = cookieValue(await refresh(first).expect(200));

      const res = await logout(current).expect(204);
      expectCleared(res);
      expect(res.text).toBe("");

      expect((await row(current))!.revokedAt).toBeInstanceOf(Date);
      expect((await row(first))!.revokedAt).toBeInstanceOf(Date);
      await refresh(current).expect(401);
    });

    it("only ends the session of that device", async () => {
      const phone = await signIn();
      const laptop = await signIn();
      await logout(phone.raw).expect(204);
      await refresh(phone.raw).expect(401);
      await refresh(laptop.raw).expect(200);
    });

    it("is idempotent and never fails", async () => {
      const { raw } = await signIn();
      await logout(raw).expect(204);
      await logout(raw).expect(204);
      await logout().expect(204);
      await logout("A".repeat(43)).expect(204);
    });
  });
});
