// Set before AppModule is imported: ConfigModule reads process.env when the module is created.
process.env.NODE_ENV = "test";
process.env.DB_MODE = "mock";
process.env.MOCK_DB_PATH = "";
process.env.JWT_ACCESS_SECRET = "t".repeat(40);
process.env.ARGON2_MEMORY_KIB = "1024";
process.env.ARGON2_TIME_COST = "1";
process.env.LOGIN_IP_LIMIT = "100000";
process.env.LOGIN_FAIL_LIMIT = "100000";
process.env.SEED_ADMIN_USERNAME = "admin";
process.env.SEED_ADMIN_PASSWORD = "AdminPass#1";

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { PasswordService } from "../auth/password.service";
import { User } from "../users/user.schema";
import { Customer } from "./customer.schema";
import { GSTIN_EXISTS } from "./customers.service";

const GSTIN = "27AAPFU0939F1ZV";
const GSTIN_KA = "29AAPFU0939F1ZR";
const body = (over: Record<string, unknown> = {}) => ({
  name: "Sri Lakshmi Traders",
  email: "accounts@example.com",
  phone: "9876543210",
  address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
  gstin: GSTIN,
  ...over,
});

describe("GET/PATCH/DELETE /customers/:id (mock database)", () => {
  let app: INestApplication;
  let customers: Model<Customer>;
  let token: string;
  let adminToken: string;
  let adminId: string;
  let staffId: string;

  const api = (method: "get" | "post" | "patch" | "delete", path: string, auth: string | null = token) => {
    const r = request(app.getHttpServer())[method](`/api/v1/customers${path}`);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const create = async (over: Record<string, unknown> = {}) =>
    (await api("post", "").send(body(over)).expect(201)).body.data as { id: string };
  const errorsOf = (res: request.Response): string[] => res.body.data?.errors ?? [];

  async function login(username: string, password: string) {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ username, password }).expect(200);
    return { token: res.body.data.accessToken as string, id: res.body.data.user.id as string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    customers = app.get<Model<Customer>>(getModelToken(Customer.name));
    await customers.init();
    const users = app.get<Model<User>>(getModelToken(User.name));
    await users.create({
      username: "staff01",
      passwordHash: await app.get(PasswordService).hash("StaffPass#1"),
      fullName: "Staff",
      role: "ADMIN",
    });
    const a = await login("admin", "AdminPass#1");
    token = a.token;
    adminId = a.id;
    const s = await login("staff01", "StaffPass#1");
    adminToken = s.token;
    staffId = s.id;
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    await customers.deleteMany({});
  });

  describe("GET", () => {
    it("returns the customer without internal fields", async () => {
      const { id } = await create();
      const res = await api("get", `/${id}`).expect(200);
      expect(res.body.data).toMatchObject({ id, name: "Sri Lakshmi Traders", gstin: GSTIN, stateCode: "27" });
      expect(res.body.data.nameLower).toBeUndefined();
    });

    it("works for an ADMIN", async () => {
      const { id } = await create();
      await api("get", `/${id}`, adminToken).expect(200);
    });

    it("404s for unknown, malformed and deleted ids", async () => {
      await api("get", "/64b7f0f0f0f0f0f0f0f0f0f0").expect(404);
      for (const bad of ["abc", "123", "%24where", "64b7f0f0f0f0f0f0f0f0f0f", "zzzzzzzzzzzzzzzzzzzzzzzz"]) {
        await api("get", `/${bad}`).expect(404);
      }
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      await api("get", `/${id}`).expect(404);
    });

    it("requires sign-in", async () => {
      const { id } = await create();
      await api("get", `/${id}`, null).expect(401);
    });
  });

  describe("PATCH", () => {
    it("changes only the fields sent and sets updatedBy", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`, adminToken).send({ name: "  New Name Ltd " }).expect(200);
      expect(res.body.data).toMatchObject({ id, name: "New Name Ltd", email: "accounts@example.com", gstin: GSTIN });
      const row = await customers.findById(id).lean();
      expect(row?.updatedBy?.toString()).toBe(staffId);
      expect(row?.createdBy?.toString()).toBe(adminId);
      expect(row?.nameLower).toBe("new name ltd");
    });

    it("normalises values like create does", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`)
        .send({ email: " NEW@Example.COM ", phone: "+91 91234-56789" })
        .expect(200);
      expect(res.body.data).toMatchObject({ email: "new@example.com", phone: "9123456789" });
    });

    it("replaces the whole address when sent, and requires all parts", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`)
        .send({ address: { line: "9 New Street", city: "Hubli", pincode: "580020" } })
        .expect(200);
      expect(res.body.data.address).toEqual({ line: "9 New Street", city: "Hubli", pincode: "580020" });
      const partial = await api("patch", `/${id}`).send({ address: { city: "Hubli" } }).expect(400);
      expect(errorsOf(partial).some((e) => e.startsWith("address.line"))).toBe(true);
    });

    it("sets and clears the alternate phone", async () => {
      const { id } = await create();
      const set = await api("patch", `/${id}`).send({ phoneAlt: "9000011111" }).expect(200);
      expect(set.body.data.phoneAlt).toBe("9000011111");
      const cleared = await api("patch", `/${id}`).send({ phoneAlt: null }).expect(200);
      expect(cleared.body.data.phoneAlt).toBeUndefined();
      await api("patch", `/${id}`).send({ phoneAlt: "9000011111" }).expect(200);
      const empty = await api("patch", `/${id}`).send({ phoneAlt: "" }).expect(200);
      expect(empty.body.data.phoneAlt).toBeUndefined();
    });

    it("re-derives the state code when the GSTIN changes", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`).send({ gstin: GSTIN_KA.toLowerCase() }).expect(200);
      expect(res.body.data).toMatchObject({ gstin: GSTIN_KA, stateCode: "29" });
    });

    it("allows the customer's own unchanged GSTIN", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).send({ gstin: GSTIN, name: "Same GSTIN Co" }).expect(200);
    });

    it("409s when another customer has the GSTIN", async () => {
      await create({ gstin: GSTIN_KA });
      const { id } = await create();
      const res = await api("patch", `/${id}`).send({ gstin: GSTIN_KA }).expect(409);
      expect(res.body.code).toBe(GSTIN_EXISTS);
      expect((await customers.findById(id).lean())?.gstin).toBe(GSTIN);
    });

    it("allows a GSTIN that only a deleted customer used", async () => {
      const old = await create({ gstin: GSTIN_KA });
      await api("delete", `/${old.id}`).expect(204);
      const { id } = await create();
      await api("patch", `/${id}`).send({ gstin: GSTIN_KA }).expect(200);
    });

    it("400s for an empty body", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).send({}).expect(400);
    });

    it.each([
      ["name", { name: "A" }],
      ["email", { email: "nope" }],
      ["phone", { phone: "12345" }],
      ["gstin", { gstin: "27AAPFU0939F1ZX" }],
      ["address.pincode", { address: { line: "x", city: "Mysuru", pincode: "012345" } }],
    ])("400s for an invalid %s, naming the field", async (field, payload) => {
      const { id } = await create();
      const res = await api("patch", `/${id}`).send(payload).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(errorsOf(res).some((e) => e.startsWith(field))).toBe(true);
    });

    it.each([
      ["stateCode", "29"],
      ["isDeleted", true],
      ["createdBy", "x"],
      ["id", "x"],
      ["logo", {}],
      ["nameLower", "x"],
    ])("rejects the forbidden field %s", async (key, value) => {
      const { id } = await create();
      await api("patch", `/${id}`).send({ [key]: value }).expect(400);
    });

    it("404s for unknown, malformed and deleted customers", async () => {
      await api("patch", "/64b7f0f0f0f0f0f0f0f0f0f0").send({ name: "Valid Name" }).expect(404);
      await api("patch", "/not-an-id").send({ name: "Valid Name" }).expect(404);
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      await api("patch", `/${id}`).send({ name: "Valid Name" }).expect(404);
    });

    it("requires sign-in", async () => {
      const { id } = await create();
      await api("patch", `/${id}`, null).send({ name: "Valid Name" }).expect(401);
    });
  });

  describe("DELETE", () => {
    it("soft-deletes: 204, flags set, row kept, gone from list and get", async () => {
      const { id } = await create();
      const res = await api("delete", `/${id}`, adminToken).expect(204);
      expect(res.text).toBe("");
      const row = await customers.findById(id).lean();
      expect(row).toMatchObject({ isDeleted: true });
      expect(row?.deletedAt).toBeInstanceOf(Date);
      expect(row?.updatedBy?.toString()).toBe(staffId);
      expect((await api("get", "").expect(200)).body.data.total).toBe(0);
      await api("get", `/${id}`).expect(404);
    });

    it("404s the second time, and for unknown or malformed ids", async () => {
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      await api("delete", `/${id}`).expect(404);
      await api("delete", "/64b7f0f0f0f0f0f0f0f0f0f0").expect(404);
      await api("delete", "/abc").expect(404);
    });

    it("frees the GSTIN for a new customer", async () => {
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      const again = await create();
      expect(again.id).not.toBe(id);
    });

    it("lets only one of parallel deletes succeed", async () => {
      const { id } = await create();
      const codes = (await Promise.all(Array.from({ length: 5 }, () => api("delete", `/${id}`)))).map((r) => r.status);
      expect(codes.filter((c) => c === 204)).toHaveLength(1);
      expect(codes.filter((c) => c === 404)).toHaveLength(4);
    });

    it("requires sign-in", async () => {
      const { id } = await create();
      await api("delete", `/${id}`, null).expect(401);
    });
  });
});
