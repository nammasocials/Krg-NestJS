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
import { AuditLog } from "../audit/audit-log.schema";
import { AuditService } from "../audit/audit.service";
import { Product } from "./product.schema";
import { PRODUCT_NAME_EXISTS } from "./products.service";

const body = (over: Record<string, unknown> = {}) => ({
  name: "Basmati Rice 25kg",
  unit: "PACK",
  unitPrice: 125050,
  hsnCode: "10063020",
  gstRate: 5,
  ...over,
});
const MISSING = "64b7f0f0f0f0f0f0f0f0f0f0";

describe("GET/PATCH/DELETE /products/:id (mock database)", () => {
  let app: INestApplication;
  let products: Model<Product>;
  let logs: Model<AuditLog>;
  let token: string;
  let adminId: string;

  const api = (method: "get" | "post" | "patch" | "delete", path: string, auth: string | null = token) => {
    const r = request(app.getHttpServer())[method](`/api/v1/products${path}`);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const create = async (over: Record<string, unknown> = {}) =>
    (await api("post", "").send(body(over)).expect(201)).body.data as { id: string };
  const errorsOf = (res: request.Response): string[] => res.body.data?.errors ?? [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    products = app.get<Model<Product>>(getModelToken(Product.name));
    logs = app.get<Model<AuditLog>>(getModelToken(AuditLog.name));
    await products.init();
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
    await products.deleteMany({});
    await logs.deleteMany({});
  });

  describe("GET", () => {
    it("returns the product without internal fields", async () => {
      const { id } = await create();
      const res = await api("get", `/${id}`).expect(200);
      expect(res.body.data).toMatchObject({
        id,
        name: "Basmati Rice 25kg",
        unit: "PACK",
        unitPrice: 125050,
        hsnCode: "10063020",
        gstRate: 5,
        isActive: true,
        stock: { qtyOnHand: 0 },
      });
      expect(res.body.data.nameLower).toBeUndefined();
      expect(res.body.data._id).toBeUndefined();
    });

    it("includes the image info when there is one", async () => {
      const { id } = await create();
      await products.updateOne({ _id: id }, { image: { fileId: "f1", mime: "image/png", size: 10 } });
      const res = await api("get", `/${id}`).expect(200);
      expect(res.body.data.image).toMatchObject({ fileId: "f1", mime: "image/png", size: 10 });
    });

    it("returns an inactive product too", async () => {
      const { id } = await create();
      await products.updateOne({ _id: id }, { isActive: false });
      expect((await api("get", `/${id}`).expect(200)).body.data.isActive).toBe(false);
    });

    it("404s for unknown, malformed and deleted ids", async () => {
      await api("get", `/${MISSING}`).expect(404);
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
      const res = await api("patch", `/${id}`).send({ name: "  Sona Masoori Rice " }).expect(200);
      expect(res.body.data).toMatchObject({ id, name: "Sona Masoori Rice", unit: "PACK", unitPrice: 125050, gstRate: 5 });
      const row = await products.findById(id).lean();
      expect(String(row?.updatedBy)).toBe(adminId);
      expect(row?.nameLower).toBe("sona masoori rice");
    });

    it("can change every editable field at once", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`)
        .send({ name: "Loose Rice", unit: "PIECE", unitPrice: 9900, hsnCode: "1006", gstRate: 0, isActive: false })
        .expect(200);
      expect(res.body.data).toMatchObject({ name: "Loose Rice", unit: "PIECE", unitPrice: 9900, hsnCode: "1006", gstRate: 0, isActive: false });
    });

    it("deactivates and reactivates", async () => {
      const { id } = await create();
      expect((await api("patch", `/${id}`).send({ isActive: false }).expect(200)).body.data.isActive).toBe(false);
      expect((await api("patch", `/${id}`).send({ isActive: true }).expect(200)).body.data.isActive).toBe(true);
    });

    it("allows the product's own name, even with different case", async () => {
      const { id } = await create();
      const res = await api("patch", `/${id}`).send({ name: "BASMATI RICE 25KG" }).expect(200);
      expect(res.body.data.name).toBe("BASMATI RICE 25KG");
    });

    it("409s when another product has the name (any case), and changes nothing", async () => {
      await create({ name: "Sunflower Oil" });
      const { id } = await create();
      const res = await api("patch", `/${id}`).send({ name: "sunflower oil" }).expect(409);
      expect(res.body.code).toBe(PRODUCT_NAME_EXISTS);
      expect((await products.findById(id).lean())?.name).toBe("Basmati Rice 25kg");
      expect(await logs.countDocuments({ action: "UPDATE" })).toBe(0);
    });

    it("409s when an inactive product holds the name", async () => {
      const other = await create({ name: "Resting Item" });
      await api("patch", `/${other.id}`).send({ isActive: false }).expect(200);
      const { id } = await create();
      await api("patch", `/${id}`).send({ name: "Resting Item" }).expect(409);
    });

    it("allows a name that only a deleted product used", async () => {
      const old = await create({ name: "Old Name" });
      await api("delete", `/${old.id}`).expect(204);
      const { id } = await create();
      await api("patch", `/${id}`).send({ name: "Old Name" }).expect(200);
    });

    it("does not touch the stock or the image", async () => {
      const { id } = await create();
      await products.updateOne({ _id: id }, { "stock.qtyOnHand": 12, image: { fileId: "f1", mime: "image/png", size: 10 } });
      await api("patch", `/${id}`).send({ unitPrice: 100 }).expect(200);
      const row = await products.findById(id).lean();
      expect(row?.stock.qtyOnHand).toBe(12);
      expect(row?.image?.fileId).toBe("f1");
    });

    it("400s for an empty body", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).send({}).expect(400);
    });

    it.each([
      ["name", { name: "A" }],
      ["name", { name: "-bad" }],
      ["unit", { unit: "BOX" }],
      ["unitPrice", { unitPrice: 10.5 }],
      ["unitPrice", { unitPrice: -1 }],
      ["hsnCode", { hsnCode: "12345" }],
      ["gstRate", { gstRate: 7 }],
      ["isActive", { isActive: "yes" }],
    ])("400s for an invalid %s, naming the field", async (field, payload) => {
      const { id } = await create();
      const res = await api("patch", `/${id}`).send(payload).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(errorsOf(res).some((e) => e.startsWith(field))).toBe(true);
    });

    it.each([
      ["stock", { qtyOnHand: 5 }],
      ["isDeleted", true],
      ["createdBy", "x"],
      ["id", "x"],
      ["image", {}],
      ["nameLower", "x"],
    ])("rejects the forbidden field %s", async (key, value) => {
      const { id } = await create();
      await api("patch", `/${id}`).send({ [key]: value }).expect(400);
    });

    it("404s for unknown, malformed and deleted products", async () => {
      await api("patch", `/${MISSING}`).send({ name: "Valid Name" }).expect(404);
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
      const res = await api("delete", `/${id}`).expect(204);
      expect(res.text).toBe("");
      const row = await products.findById(id).lean();
      expect(row).toMatchObject({ isDeleted: true });
      expect(row?.deletedAt).toBeInstanceOf(Date);
      expect(String(row?.updatedBy)).toBe(adminId);
      expect((await api("get", "").expect(200)).body.data.total).toBe(0);
      await api("get", `/${id}`).expect(404);
    });

    it("404s the second time, and for unknown or malformed ids", async () => {
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      await api("delete", `/${id}`).expect(404);
      await api("delete", `/${MISSING}`).expect(404);
      await api("delete", "/abc").expect(404);
    });

    it("frees the name for a new product", async () => {
      const { id } = await create();
      await api("delete", `/${id}`).expect(204);
      expect((await create()).id).not.toBe(id);
    });

    it("deletes an inactive product too", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).send({ isActive: false }).expect(200);
      await api("delete", `/${id}`).expect(204);
    });

    it("lets only one of parallel deletes succeed, with one audit row", async () => {
      const { id } = await create();
      const codes = (await Promise.all(Array.from({ length: 5 }, () => api("delete", `/${id}`)))).map((r) => r.status);
      expect(codes.filter((c) => c === 204)).toHaveLength(1);
      expect(codes.filter((c) => c === 404)).toHaveLength(4);
      expect(await logs.countDocuments({ action: "DELETE" })).toBe(1);
    });

    it("requires sign-in", async () => {
      const { id } = await create();
      await api("delete", `/${id}`, null).expect(401);
    });
  });

  describe("audit", () => {
    it("writes an UPDATE row with before, after, changed fields, actor and request id", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).set("X-Request-Id", "product-update-0001").send({ unitPrice: 200000, isActive: false }).expect(200);
      const rows = await logs.find({ entity: "product", action: "UPDATE" }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ entityId: id, requestId: "product-update-0001" });
      expect(String(rows[0].actorId)).toBe(adminId);
      expect(rows[0].before).toMatchObject({ unitPrice: 125050, isActive: true });
      expect(rows[0].after).toMatchObject({ unitPrice: 200000, isActive: false });
      expect([...(rows[0].changedFields ?? [])].sort()).toEqual(["isActive", "unitPrice"]);
    });

    it("records an activate/deactivate flip as an UPDATE", async () => {
      const { id } = await create();
      await api("patch", `/${id}`).send({ isActive: false }).expect(200);
      const rows = await logs.find({ action: "UPDATE" }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0].changedFields).toEqual(["isActive"]);
    });

    it("a PATCH that changes nothing is 200 with no audit row and an untouched updatedAt", async () => {
      const { id } = await create();
      const before = await products.findById(id).lean();
      const res = await api("patch", `/${id}`).send({ name: "Basmati Rice 25kg", unitPrice: 125050, isActive: true }).expect(200);
      expect(res.body.data.name).toBe("Basmati Rice 25kg");
      expect(await logs.countDocuments({ action: "UPDATE" })).toBe(0);
      const after = await products.findById(id).lean();
      expect((after as unknown as { updatedAt: Date }).updatedAt).toEqual((before as unknown as { updatedAt: Date }).updatedAt);
    });

    it("writes a DELETE row with the before-state", async () => {
      const { id } = await create();
      await api("delete", `/${id}`).set("X-Request-Id", "product-delete-0001").expect(204);
      const rows = await logs.find({ entity: "product", action: "DELETE" }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ entityId: id, requestId: "product-delete-0001" });
      expect(String(rows[0].actorId)).toBe(adminId);
      expect(rows[0].before).toMatchObject({ name: "Basmati Rice 25kg" });
    });

    it("a failed audit write rolls the update back", async () => {
      const { id } = await create();
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await api("patch", `/${id}`).send({ name: "Changed Name" }).expect(500);
      expect((await products.findById(id).lean())?.name).toBe("Basmati Rice 25kg");
      expect(await logs.countDocuments({ action: "UPDATE" })).toBe(0);
    });

    it("a failed audit write rolls the delete back", async () => {
      const { id } = await create();
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await api("delete", `/${id}`).expect(500);
      expect((await products.findById(id).lean())?.isDeleted).toBe(false);
      await api("get", `/${id}`).expect(200);
    });

    it("a rejected or missing request writes no audit row", async () => {
      const { id } = await create();
      await logs.deleteMany({});
      await api("patch", `/${id}`).send({ gstRate: 7 }).expect(400);
      await api("patch", `/${MISSING}`).send({ name: "Valid Name" }).expect(404);
      await api("delete", `/${MISSING}`).expect(404);
      expect(await logs.countDocuments()).toBe(0);
    });
  });
});
