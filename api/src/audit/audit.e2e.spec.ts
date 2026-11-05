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
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Connection, Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { Customer } from "../customers/customer.schema";
import { AuditLog } from "./audit-log.schema";
import { AuditService } from "./audit.service";

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

describe("audit trail (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let customers: Model<Customer>;
  let logs: Model<AuditLog>;
  let audit: AuditService;
  let token: string;
  let adminId: string;

  const api = (method: "get" | "post" | "patch" | "delete", path = "") =>
    request(app.getHttpServer())[method](`/api/v1/customers${path}`).set("Authorization", `Bearer ${token}`);
  const rows = () => logs.find({}).sort({ createdAt: 1, _id: 1 }).lean();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    customers = app.get<Model<Customer>>(getModelToken(Customer.name));
    logs = app.get<Model<AuditLog>>(getModelToken(AuditLog.name));
    audit = app.get(AuditService);
    await customers.init();
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "AdminPass#1" })
      .expect(200);
    token = res.body.data.accessToken;
    adminId = res.body.data.user.id;
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    jest.restoreAllMocks();
    await customers.deleteMany({});
    await logs.deleteMany({});
  });

  it("the migration created the collection and its indexes", async () => {
    const indexes = await connection.collection("auditLogs").indexes();
    const byName = Object.fromEntries(indexes.map((i) => [i.name!, i.key]));
    expect(byName.entity_entityId_createdAt).toEqual({ entity: 1, entityId: 1, createdAt: -1 });
    expect(byName.actorId_createdAt).toEqual({ actorId: 1, createdAt: -1 });
    expect(byName.createdAt_desc).toEqual({ createdAt: -1 });
  });

  it("offers no way to change or remove rows", () => {
    const methods = Object.getOwnPropertyNames(AuditService.prototype).filter((m) => m !== "constructor");
    expect(methods).toEqual(["record"]);
  });

  describe("record()", () => {
    it("computes changedFields and strips secrets", async () => {
      await audit.record({
        entity: "user",
        entityId: "u1",
        action: "UPDATE",
        before: { fullName: "A", passwordHash: "$argon2id$old" },
        after: { fullName: "B", passwordHash: "$argon2id$new", bytes: Buffer.from("x") },
        actorId: adminId,
        requestId: "req-12345678",
      });
      const [row] = await rows();
      expect(row).toMatchObject({ entity: "user", entityId: "u1", action: "UPDATE", changedFields: ["fullName"] });
      expect(row.before).toEqual({ fullName: "A" });
      expect(row.after).toEqual({ fullName: "B" });
      expect(JSON.stringify(row)).not.toMatch(/argon2|passwordHash/);
      expect(row.actorId?.toString()).toBe(adminId);
      expect(row.requestId).toBe("req-12345678");
      expect((row as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
    });

    it("rejects an unknown action", async () => {
      await expect(audit.record({ entity: "x", entityId: "1", action: "NOPE" as never })).rejects.toThrow();
    });
  });

  describe("customer changes", () => {
    it("create writes one CREATE row with no before", async () => {
      const res = await api("post").set("X-Request-Id", "create-req-0001").send(body()).expect(201);
      expect(res.headers["x-request-id"]).toBe("create-req-0001");
      const all = await rows();
      expect(all).toHaveLength(1);
      const [row] = all;
      expect(row).toMatchObject({ entity: "customer", entityId: res.body.data.id, action: "CREATE", requestId: "create-req-0001" });
      expect(row.before).toBeUndefined();
      expect(row.after).toMatchObject({ name: "Sri Lakshmi Traders", gstin: GSTIN, stateCode: "27" });
      expect(row.changedFields).toEqual(expect.arrayContaining(["name", "gstin", "address.city", "stateCode"]));
      expect(row.changedFields).not.toContain("updatedAt");
      expect(row.actorId?.toString()).toBe(adminId);
    });

    it("edit writes one UPDATE row with both sides and only the changed fields", async () => {
      const { id } = (await api("post").send(body())).body.data;
      await api("patch", `/${id}`)
        .send({ name: "Renamed Co", address: { line: "12 Market Road", city: "Hubli", pincode: "570001" }, gstin: GSTIN_KA })
        .expect(200);
      const all = await rows();
      expect(all.map((r) => r.action)).toEqual(["CREATE", "UPDATE"]);
      const update = all[1];
      expect(update.changedFields).toEqual(["address.city", "gstin", "name", "stateCode"]);
      expect(update.before).toMatchObject({ name: "Sri Lakshmi Traders", gstin: GSTIN, stateCode: "27" });
      expect(update.after).toMatchObject({ name: "Renamed Co", gstin: GSTIN_KA, stateCode: "29" });
      expect(update.entityId).toBe(id);
    });

    it("an edit that changes nothing writes no row and no update", async () => {
      const { id } = (await api("post").send(body())).body.data;
      const before = await customers.findById(id).lean();
      await api("patch", `/${id}`).send({ name: "Sri Lakshmi Traders", gstin: GSTIN.toLowerCase(), phoneAlt: null }).expect(200);
      expect(await logs.countDocuments({ action: "UPDATE" })).toBe(0);
      const stamp = (c: unknown) => (c as { updatedAt: Date }).updatedAt;
      expect(stamp(await customers.findById(id).lean())).toEqual(stamp(before));
    });

    it("delete writes one DELETE row with before only", async () => {
      const { id } = (await api("post").send(body())).body.data;
      await api("delete", `/${id}`).set("X-Request-Id", "delete-req-0001").expect(204);
      const [, del] = await rows();
      expect(del).toMatchObject({ action: "DELETE", entityId: id, requestId: "delete-req-0001", changedFields: [] });
      expect(del.after).toBeUndefined();
      expect(del.before).toMatchObject({ name: "Sri Lakshmi Traders", isDeleted: false });
    });

    it("failed requests leave no audit row", async () => {
      await api("post").send(body({ name: "A" })).expect(400);
      const { id } = (await api("post").send(body())).body.data;
      await api("post").send(body()).expect(409);
      await api("patch", `/${id}`).send({}).expect(400);
      await api("patch", `/${id}`).send({ gstin: "bad" }).expect(400);
      await api("patch", "/64b7f0f0f0f0f0f0f0f0f0f0").send({ name: "Valid Name" }).expect(404);
      await api("delete", "/64b7f0f0f0f0f0f0f0f0f0f0").expect(404);
      expect(await logs.countDocuments()).toBe(1);
    });

    it("parallel creates with one GSTIN leave exactly one customer and one row", async () => {
      const results = await Promise.all(Array.from({ length: 5 }, () => api("post").send(body())));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(await customers.countDocuments()).toBe(1);
      expect(await logs.countDocuments()).toBe(1);
    });

    it("parallel deletes write exactly one DELETE row", async () => {
      const { id } = (await api("post").send(body())).body.data;
      await Promise.all(Array.from({ length: 5 }, () => api("delete", `/${id}`)));
      expect(await logs.countDocuments({ action: "DELETE" })).toBe(1);
    });
  });

  describe("consistency: the change and its audit row stand or fall together", () => {
    const failAudit = () => jest.spyOn(audit, "record").mockRejectedValueOnce(new Error("audit down"));

    it("create: if the audit row fails, no customer is saved", async () => {
      failAudit();
      await api("post").send(body()).expect(500);
      expect(await customers.countDocuments()).toBe(0);
      expect(await logs.countDocuments()).toBe(0);
    });

    it("edit: if the audit row fails, the customer is unchanged", async () => {
      const { id } = (await api("post").send(body())).body.data;
      failAudit();
      await api("patch", `/${id}`).send({ name: "Should Not Stick" }).expect(500);
      expect((await customers.findById(id).lean())?.name).toBe("Sri Lakshmi Traders");
      expect(await logs.countDocuments({ action: "UPDATE" })).toBe(0);
    });

    it("delete: if the audit row fails, the customer is not deleted", async () => {
      const { id } = (await api("post").send(body())).body.data;
      failAudit();
      await api("delete", `/${id}`).expect(500);
      expect((await customers.findById(id).lean())?.isDeleted).toBe(false);
      expect(await logs.countDocuments({ action: "DELETE" })).toBe(0);
      await api("get", `/${id}`).expect(200);
    });
  });

  describe("request id", () => {
    it("is generated when none is sent, and returned in the response header", async () => {
      const res = await api("post").send(body()).expect(201);
      const header = res.headers["x-request-id"];
      expect(header).toMatch(/^[0-9a-f-]{36}$/);
      expect((await rows())[0].requestId).toBe(header);
    });

    it("ignores an unsafe caller-supplied id", async () => {
      const res = await api("post").set("X-Request-Id", "bad id with spaces <script>").send(body()).expect(201);
      expect(res.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
      expect((await rows())[0].requestId).toBe(res.headers["x-request-id"]);
    });

    it("is returned on every response, including errors", async () => {
      const res = await request(app.getHttpServer()).get("/api/v1/customers").expect(401);
      expect(res.headers["x-request-id"]).toBeTruthy();
    });
  });
});
