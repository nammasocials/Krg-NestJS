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

import { Controller, Get, INestApplication } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { User } from "../users/user.schema";
import type { AuthUser } from "./auth-user";
import { CurrentUser, Public, Roles } from "./decorators";
import { AUTH_REQUIRED } from "./jwt-auth.guard";
import { PasswordService } from "./password.service";
import { FORBIDDEN_MESSAGE } from "./roles.guard";

// Routes that exist only in this test, to exercise the global guards without depending on later epics.
@Controller("guard-test")
class GuardTestController {
  @Get("any")
  any(@CurrentUser() user: AuthUser) {
    return user;
  }

  @Get("super")
  @Roles("SUPER_ADMIN")
  superOnly() {
    return { ok: true };
  }

  @Get("either")
  @Roles("SUPER_ADMIN", "ADMIN")
  either() {
    return { ok: true };
  }

  @Get("open")
  @Public()
  open() {
    return { open: true };
  }
}

describe("global authentication and roles (mock database)", () => {
  let app: INestApplication;
  let users: Model<User>;
  let jwt: JwtService;

  const http = () => request(app.getHttpServer());
  const get = (path: string, token?: string, scheme = "Bearer") => {
    const req = http().get(`/api/v1${path}`);
    return token === undefined ? req : req.set("Authorization", `${scheme} ${token}`);
  };
  const loginAs = async (username: string, password: string) => {
    const res = await http().post("/api/v1/auth/login").send({ username, password }).expect(200);
    return res.body.data as { accessToken: string; user: { id: string } };
  };
  const expect401 = (res: request.Response) => {
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ code: "UNAUTHORIZED", message: AUTH_REQUIRED, data: null });
  };

  let adminToken: string; // SUPER_ADMIN (the seeded user)
  let staffToken: string; // ADMIN
  let staffId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule], controllers: [GuardTestController] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    users = app.get(getModelToken(User.name));
    jwt = app.get(JwtService);

    await users.create({
      username: "staff03",
      passwordHash: await app.get(PasswordService).hash("StaffPass#3"),
      fullName: "Staff Three",
      role: "ADMIN",
    });
    adminToken = (await loginAs("admin", "AdminPass#1")).accessToken;
    const staff = await loginAs("staff03", "StaffPass#3");
    staffToken = staff.accessToken;
    staffId = staff.user.id;
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  describe("public routes need no token", () => {
    it("health", async () => {
      await http().get("/api/v1/health").expect(200);
    });

    it("login (wrong password still reaches the handler: 401 from login, not from the guard)", async () => {
      const res = await http().post("/api/v1/auth/login").send({ username: "staff03", password: "nope" }).expect(401);
      expect(res.body.message).toBe("Invalid username or password");
    });

    it("refresh and logout", async () => {
      expect((await http().post("/api/v1/auth/refresh").expect(401)).body.message).toBe("Session expired. Please sign in again.");
      await http().post("/api/v1/auth/logout").expect(204);
    });

    it("a route marked @Public()", async () => {
      expect((await get("/guard-test/open")).body.data).toEqual({ open: true });
    });
  });

  describe("everything else needs a valid access token", () => {
    it("rejects a missing header", async () => expect401(await get("/guard-test/any")));
    it("rejects a non-Bearer scheme", async () => expect401(await get("/guard-test/any", staffToken, "Basic")));
    it("rejects a malformed header", async () => {
      expect401(await http().get("/api/v1/guard-test/any").set("Authorization", "Bearer"));
      expect401(await http().get("/api/v1/guard-test/any").set("Authorization", `Bearer ${staffToken} extra`));
    });
    it("rejects garbage", async () => expect401(await get("/guard-test/any", "not.a.jwt")));
    it("rejects a refresh token used as a bearer token", async () => expect401(await get("/guard-test/any", "A".repeat(43))));

    it("rejects an expired token", async () => {
      const expired = await jwt.signAsync({ sub: staffId, role: "ADMIN", exp: Math.floor(Date.now() / 1000) - 10 });
      expect401(await get("/guard-test/any", expired));
    });

    it("rejects a token signed with another secret", async () => {
      const forged = await new JwtService({ secret: "x".repeat(40) }).signAsync({ sub: staffId, role: "SUPER_ADMIN" }, { expiresIn: 600 });
      expect401(await get("/guard-test/any", forged));
    });

    it("rejects an unsigned (alg none) token", async () => {
      const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
      const none = `${b64({ alg: "none", typ: "JWT" })}.${b64({ sub: staffId, role: "SUPER_ADMIN", exp: Math.floor(Date.now() / 1000) + 600 })}.`;
      expect401(await get("/guard-test/any", none));
    });

    it("rejects a signed token with an unknown role or no subject", async () => {
      expect401(await get("/guard-test/any", await jwt.signAsync({ sub: staffId, role: "ROOT" }, { expiresIn: 600 })));
      expect401(await get("/guard-test/any", await jwt.signAsync({ role: "ADMIN" }, { expiresIn: 600 })));
    });

    it("accepts a valid token and exposes { id, role } to the handler", async () => {
      const res = await get("/guard-test/any", staffToken).expect(200);
      expect(res.body.data).toEqual({ id: staffId, role: "ADMIN" });
    });

    it("also protects the auth routes that need a session", async () => {
      expect401(await get("/auth/me"));
    });
  });

  describe("@Roles()", () => {
    it("lets the matching role in", async () => {
      await get("/guard-test/super", adminToken).expect(200);
    });

    it("returns 403 for the wrong role", async () => {
      const res = await get("/guard-test/super", staffToken).expect(403);
      expect(res.body).toEqual({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE, data: null });
    });

    it("accepts any listed role", async () => {
      await get("/guard-test/either", staffToken).expect(200);
      await get("/guard-test/either", adminToken).expect(200);
    });

    it("without @Roles() any signed-in role passes", async () => {
      await get("/guard-test/any", staffToken).expect(200);
      await get("/guard-test/any", adminToken).expect(200);
    });

    it("checks authentication before roles (no token on a role route is 401, not 403)", async () => {
      expect401(await get("/guard-test/super"));
    });
  });

  describe("GET /auth/me", () => {
    it("returns the current user", async () => {
      const res = await get("/auth/me", staffToken).expect(200);
      expect(res.body.data).toEqual({ id: staffId, username: "staff03", fullName: "Staff Three", role: "ADMIN" });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash/);
    });

    it("reads the database, not the token", async () => {
      await users.updateOne({ username: "staff03" }, { fullName: "Renamed Staff" });
      expect((await get("/auth/me", staffToken).expect(200)).body.data.fullName).toBe("Renamed Staff");
    });

    it("refuses a valid token once the user is deactivated, and works again after reactivation", async () => {
      await users.updateOne({ username: "staff03" }, { isActive: false });
      expect401(await get("/auth/me", staffToken));
      await users.updateOne({ username: "staff03" }, { isActive: true });
      await get("/auth/me", staffToken).expect(200);
    });

    it("refuses a valid token for a user who no longer exists", async () => {
      const ghost = await jwt.signAsync({ sub: "64b7f0c2a1b2c3d4e5f60718", role: "ADMIN" }, { expiresIn: 600 });
      expect401(await get("/auth/me", ghost));
    });
  });
});
