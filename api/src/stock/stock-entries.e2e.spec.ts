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
import { type Connection, type Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { AuditLog } from "../audit/audit-log.schema";
import { AuditService } from "../audit/audit.service";
import { Product } from "../products/product.schema";
import { MAX_BALANCE } from "./movement-rules";
import { StockMovement } from "./stock-movement.schema";

const body = (over: Record<string, unknown> = {}) => ({
  name: "Basmati Rice 25kg",
  unit: "PACK",
  unitPrice: 125050,
  hsnCode: "10063020",
  gstRate: 5,
  ...over,
});
const MISSING = "64b7f0f0f0f0f0f0f0f0f0f0";

describe("stock-in and stock adjustments (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let products: Model<Product>;
  let movements: Model<StockMovement>;
  let logs: Model<AuditLog>;
  let token: string;
  let adminId: string;

  const api = (method: "get" | "post" | "patch" | "delete", path: string, auth: string | null = token) => {
    const r = request(app.getHttpServer())[method](`/api/v1/products${path}`);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const create = async (over: Record<string, unknown> = {}) => (await api("post", "").send(body(over)).expect(201)).body.data.id as string;
  const stockIn = (id: string, payload: unknown, auth: string | null = token) => api("post", `/${id}/stock-in`, auth).send(payload as object);
  const adjust = (id: string, payload: unknown, auth: string | null = token) => api("post", `/${id}/stock-adjustments`, auth).send(payload as object);
  const onHand = async (id: string) => (await api("get", `/${id}`).expect(200)).body.data.stock.qtyOnHand as number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    products = app.get<Model<Product>>(getModelToken(Product.name));
    movements = app.get<Model<StockMovement>>(getModelToken(StockMovement.name));
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
    await connection.collection("stockMovements").deleteMany({}); // the model refuses deletes by design
  });

  describe("POST /products/:id/stock-in", () => {
    it("adds stock and returns the product and the movement", async () => {
      const id = await create({ openingStock: 10 });
      const res = await stockIn(id, { quantity: 40, note: "  Delivery, bill 118  " }).expect(201);
      expect(res.body.data.product.stock.qtyOnHand).toBe(50);
      expect(res.body.data.movement).toMatchObject({ type: "STOCK_IN", quantity: 40, balanceAfter: 50, note: "Delivery, bill 118" });
      expect(await onHand(id)).toBe(50);
    });

    it("works without a note, and a blank note counts as none", async () => {
      const id = await create();
      const a = await stockIn(id, { quantity: 1 }).expect(201);
      expect(a.body.data.movement.note).toBeUndefined();
      const b = await stockIn(id, { quantity: 1, note: "   " }).expect(201);
      expect(b.body.data.movement.note).toBeUndefined();
    });

    it("accepts the edges: 1 and 1,000,000, and a 200 character note", async () => {
      const id = await create();
      await stockIn(id, { quantity: 1, note: "n".repeat(200) }).expect(201);
      await stockIn(id, { quantity: 1_000_000 }).expect(201);
      expect(await onHand(id)).toBe(1_000_001);
    });

    it.each([
      ["0", { quantity: 0 }, "quantity"],
      ["negative", { quantity: -1 }, "quantity"],
      ["above 1,000,000", { quantity: 1_000_001 }, "quantity"],
      ["fractional", { quantity: 1.5 }, "quantity"],
      ["text", { quantity: "5x" }, "quantity"],
      ["missing", {}, "quantity"],
      ["note too long", { quantity: 1, note: "n".repeat(201) }, "note"],
    ])("rejects quantity or note that is %s", async (_label, payload, field) => {
      const id = await create();
      const res = await stockIn(id, payload).expect(400);
      expect(JSON.stringify(res.body)).toContain(field);
      expect(await onHand(id)).toBe(0);
      expect(await movements.countDocuments()).toBe(0);
    });

    it("rejects fields the caller must not choose", async () => {
      const id = await create();
      for (const extra of [{ type: "SALE" }, { balanceAfter: 999 }, { productId: MISSING }]) {
        await stockIn(id, { quantity: 1, ...extra }).expect(400);
      }
      expect(await movements.countDocuments()).toBe(0);
    });

    it("refuses a balance above the limit with STOCK_LIMIT_EXCEEDED and writes nothing", async () => {
      const id = await create();
      await products.updateOne({ _id: id }, { $set: { "stock.qtyOnHand": MAX_BALANCE - 5 } });
      const res = await stockIn(id, { quantity: 6 }).expect(409);
      expect(JSON.stringify(res.body)).toContain("STOCK_LIMIT_EXCEEDED");
      expect(JSON.stringify(res.body)).toContain("Basmati Rice 25kg");
      expect(await onHand(id)).toBe(MAX_BALANCE - 5);
      expect(await movements.countDocuments()).toBe(0);
      await stockIn(id, { quantity: 5 }).expect(201); // exactly the limit is allowed
      expect(await onHand(id)).toBe(MAX_BALANCE);
    });

    it("404 for unknown, malformed and deleted products; inactive ones are allowed", async () => {
      await stockIn(MISSING, { quantity: 1 }).expect(404);
      await stockIn("not-an-id", { quantity: 1 }).expect(404);
      const id = await create();
      await api("patch", `/${id}`).send({ isActive: false }).expect(200);
      await stockIn(id, { quantity: 2 }).expect(201);
      await api("delete", `/${id}`).expect(204);
      await stockIn(id, { quantity: 1 }).expect(404);
    });

    it("401 when signed out", async () => {
      const id = await create();
      await stockIn(id, { quantity: 1 }, null).expect(401);
    });

    it("20 parallel stock-ins of 1 add exactly 20", async () => {
      const id = await create();
      const results = await Promise.all(Array.from({ length: 20 }, () => stockIn(id, { quantity: 1 })));
      expect(results.filter((r) => r.status === 201)).toHaveLength(20);
      expect(await onHand(id)).toBe(20);
      const rows = await movements.find({}).sort({ balanceAfter: 1 }).lean();
      expect(rows.map((r) => r.balanceAfter)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    });
  });

  describe("POST /products/:id/stock-adjustments", () => {
    it("removes and adds stock with a reason", async () => {
      const id = await create({ openingStock: 50 });
      const down = await adjust(id, { quantity: -3, note: "Damaged in storage" }).expect(201);
      expect(down.body.data.movement).toMatchObject({ type: "ADJUSTMENT", quantity: -3, balanceAfter: 47, note: "Damaged in storage" });
      expect(down.body.data.product.stock.qtyOnHand).toBe(47);
      const up = await adjust(id, { quantity: 2, note: "Found on shelf" }).expect(201);
      expect(up.body.data.movement).toMatchObject({ quantity: 2, balanceAfter: 49 });
    });

    it("removing everything is fine; one more is INSUFFICIENT_STOCK and changes nothing", async () => {
      const id = await create({ openingStock: 5 });
      const res = await adjust(id, { quantity: -6, note: "Recount" }).expect(409);
      expect(JSON.stringify(res.body)).toContain("INSUFFICIENT_STOCK");
      expect(JSON.stringify(res.body)).toContain("5 in stock, 6 requested");
      expect(await onHand(id)).toBe(5);
      await adjust(id, { quantity: -5, note: "Recount" }).expect(201);
      expect(await onHand(id)).toBe(0);
      expect(await movements.countDocuments()).toBe(2); // opening + the one adjustment
    });

    it("accepts -1,000,000 and 1,000,000 as the edges", async () => {
      const id = await create();
      await adjust(id, { quantity: 1_000_000, note: "Big count" }).expect(201);
      await adjust(id, { quantity: -1_000_000, note: "Big count" }).expect(201);
      expect(await onHand(id)).toBe(0);
    });

    it.each([
      ["0", { quantity: 0, note: "Recount" }, "quantity"],
      ["above 1,000,000", { quantity: 1_000_001, note: "Recount" }, "quantity"],
      ["below -1,000,000", { quantity: -1_000_001, note: "Recount" }, "quantity"],
      ["fractional", { quantity: -1.5, note: "Recount" }, "quantity"],
      ["missing", { note: "Recount" }, "quantity"],
      ["no note", { quantity: 1 }, "note"],
      ["blank note", { quantity: 1, note: "   " }, "note"],
      ["too short a note", { quantity: 1, note: "ab" }, "note"],
      ["too long a note", { quantity: 1, note: "n".repeat(201) }, "note"],
    ])("rejects %s", async (_label, payload, field) => {
      const id = await create({ openingStock: 5 });
      const res = await adjust(id, payload).expect(400);
      expect(JSON.stringify(res.body)).toContain(field);
      expect(await onHand(id)).toBe(5);
    });

    it("rejects fields the caller must not choose", async () => {
      const id = await create();
      await adjust(id, { quantity: 1, note: "Recount", type: "SALE" }).expect(400);
      await adjust(id, { quantity: 1, note: "Recount", balanceAfter: 9 }).expect(400);
    });

    it("refuses a balance above the limit", async () => {
      const id = await create();
      await products.updateOne({ _id: id }, { $set: { "stock.qtyOnHand": MAX_BALANCE } });
      const res = await adjust(id, { quantity: 1, note: "Recount" }).expect(409);
      expect(JSON.stringify(res.body)).toContain("STOCK_LIMIT_EXCEEDED");
      expect(await onHand(id)).toBe(MAX_BALANCE);
    });

    it("404 and 401", async () => {
      await adjust(MISSING, { quantity: 1, note: "Recount" }).expect(404);
      const id = await create();
      await adjust(id, { quantity: 1, note: "Recount" }, null).expect(401);
    });
  });

  describe("audit, rollback and history", () => {
    it("writes one UPDATE audit row with stock before and after and the movement id", async () => {
      const id = await create({ openingStock: 10 });
      await logs.deleteMany({});
      const res = await stockIn(id, { quantity: 40 }).expect(201);
      const rows = await logs.find({ entityId: id }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ entity: "Product", action: "UPDATE" });
      expect(String(rows[0].actorId)).toBe(adminId);
      expect(rows[0].before).toMatchObject({ stock: { qtyOnHand: 10 } });
      expect(rows[0].after).toMatchObject({ stock: { qtyOnHand: 50 }, movementId: res.body.data.movement.id });
    });

    it("if the audit write fails nothing remains: stock, movement and audit are unchanged", async () => {
      const id = await create({ openingStock: 10 });
      const before = await movements.countDocuments();
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await stockIn(id, { quantity: 40 }).expect(500);
      expect(await onHand(id)).toBe(10);
      expect(await movements.countDocuments()).toBe(before);
    });

    it("the history shows the new rows with the actor", async () => {
      const id = await create({ openingStock: 10 });
      await stockIn(id, { quantity: 40, note: "Delivery" }).expect(201);
      await adjust(id, { quantity: -3, note: "Damaged" }).expect(201);
      const res = await api("get", `/${id}/stock-movements`).expect(200);
      const items = res.body.data.items as Array<{ type: string; quantity: number; balanceAfter: number; createdBy: { id: string } }>;
      expect(items.map((i) => [i.type, i.quantity, i.balanceAfter])).toEqual([
        ["ADJUSTMENT", -3, 47],
        ["STOCK_IN", 40, 50],
        ["OPENING", 10, 10],
      ]);
      expect(items[0].createdBy.id).toBe(adminId);
    });
  });
});
