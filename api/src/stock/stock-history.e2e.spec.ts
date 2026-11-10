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
import { type Connection, type Model, Types } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { AuditLog } from "../audit/audit-log.schema";
import { AuditService } from "../audit/audit.service";
import { Product } from "../products/product.schema";
import { StockMovement } from "./stock-movement.schema";
import { StockService } from "./stock.service";

const body = (over: Record<string, unknown> = {}) => ({
  name: "Basmati Rice 25kg",
  unit: "PACK",
  unitPrice: 125050,
  hsnCode: "10063020",
  gstRate: 5,
  ...over,
});
const MISSING = "64b7f0f0f0f0f0f0f0f0f0f0";

describe("opening stock and stock history (mock database)", () => {
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
  const create = (over: Record<string, unknown> = {}) => api("post", "").send(body(over));
  const history = (id: string, query = "", auth: string | null = token) => api("get", `/${id}/stock-movements${query}`, auth);

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

  describe("openingStock on create", () => {
    it("without it the product starts at 0 with no movement", async () => {
      const res = await create().expect(201);
      expect(res.body.data.stock.qtyOnHand).toBe(0);
      expect(await movements.countDocuments()).toBe(0);
    });

    it("with 0 it is the same as leaving it out", async () => {
      const res = await create({ openingStock: 0 }).expect(201);
      expect(res.body.data.stock.qtyOnHand).toBe(0);
      expect(await movements.countDocuments()).toBe(0);
    });

    it("above 0 sets the balance and writes one OPENING movement with the actor", async () => {
      const res = await create({ openingStock: 25 }).expect(201);
      expect(res.body.data.stock.qtyOnHand).toBe(25);
      expect(res.body.data.openingStock).toBeUndefined();
      const rows = await movements.find({}).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ type: "OPENING", quantity: 25, balanceAfter: 25 });
      expect(String(rows[0].productId)).toBe(res.body.data.id);
      expect(String(rows[0].createdBy)).toBe(adminId);
      expect((await products.findById(res.body.data.id).lean())?.stock.qtyOnHand).toBe(25);
    });

    it("accepts the largest allowed value", async () => {
      const res = await create({ openingStock: 1_000_000 }).expect(201);
      expect(res.body.data.stock.qtyOnHand).toBe(1_000_000);
    });

    it("the CREATE audit row shows the opening balance", async () => {
      const res = await create({ openingStock: 7 }).expect(201);
      const row = await logs.findOne({ entityId: res.body.data.id, action: "CREATE" }).lean();
      expect(row?.after).toMatchObject({ stock: { qtyOnHand: 7 } });
    });

    it.each([
      ["negative", -1],
      ["fractional", 2.5],
      ["too large", 1_000_001],
      ["text", "ten"],
      ["null-like text", ""],
    ])("400s for a %s opening stock, naming the field", async (_label, openingStock) => {
      const res = await create({ openingStock }).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(res.body.data.errors.some((e: string) => e.startsWith("openingStock"))).toBe(true);
      expect(await products.countDocuments()).toBe(0);
    });

    it("leaves no product and no movement if the stock step fails", async () => {
      jest.spyOn(app.get(StockService), "apply").mockRejectedValueOnce(new Error("stock down"));
      await create({ openingStock: 5 }).expect(500);
      expect(await products.countDocuments()).toBe(0);
      expect(await movements.countDocuments()).toBe(0);
      expect(await logs.countDocuments()).toBe(0);
    });

    it("leaves no product and no movement if the audit write fails", async () => {
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await create({ openingStock: 5 }).expect(500);
      expect(await products.countDocuments()).toBe(0);
      expect(await movements.countDocuments()).toBe(0);
    });

    it("a duplicate name creates nothing and no movement", async () => {
      await create({ openingStock: 3 }).expect(201);
      await create({ openingStock: 9 }).expect(409);
      expect(await movements.countDocuments()).toBe(1);
    });

    it("editing still rejects stock and openingStock", async () => {
      const { id } = (await create({ openingStock: 5 }).expect(201)).body.data;
      await api("patch", `/${id}`).send({ openingStock: 50 }).expect(400);
      await api("patch", `/${id}`).send({ stock: { qtyOnHand: 50 } }).expect(400);
      expect((await products.findById(id).lean())?.stock.qtyOnHand).toBe(5);
      expect(await movements.countDocuments()).toBe(1);
    });
  });

  describe("GET /products/:id/stock-movements", () => {
    const seed = async (productId: string, n: number) => {
      const base = Date.UTC(2026, 0, 1);
      await connection.collection("stockMovements").insertMany(
        Array.from({ length: n }, (_, i) => ({
          productId: new Types.ObjectId(productId),
          type: "STOCK_IN",
          quantity: 1,
          balanceAfter: i + 1,
          note: `entry ${i + 1}`,
          createdAt: new Date(base + i * 1000),
        })),
      );
    };

    it("returns an empty page for a product with no history", async () => {
      const { id } = (await create().expect(201)).body.data;
      const res = await history(id).expect(200);
      expect(res.body.data).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
    });

    it("shows the opening movement with type, quantity, balance and who made it", async () => {
      const { id } = (await create({ openingStock: 25 }).expect(201)).body.data;
      const res = await history(id).expect(200);
      expect(res.body.data.total).toBe(1);
      const item = res.body.data.items[0];
      expect(item).toMatchObject({ type: "OPENING", quantity: 25, balanceAfter: 25, createdBy: { id: adminId } });
      expect(typeof item.createdBy.name).toBe("string");
      expect(item.createdBy.name.length).toBeGreaterThan(0);
      expect(typeof item.id).toBe("string");
      expect(new Date(item.createdAt).toString()).not.toBe("Invalid Date");
      expect(item.invoiceId).toBeUndefined();
    });

    it("lists newest first, pages without overlap, and reports totals", async () => {
      const { id } = (await create().expect(201)).body.data;
      await seed(id, 23);
      const p1 = (await history(id).expect(200)).body.data;
      expect(p1).toMatchObject({ page: 1, pageSize: 10, total: 23, totalPages: 3 });
      expect(p1.items.map((m: { balanceAfter: number }) => m.balanceAfter)).toEqual([23, 22, 21, 20, 19, 18, 17, 16, 15, 14]);
      const seen: number[] = [];
      for (const page of [1, 2, 3]) {
        const r = (await history(id, `?page=${page}&pageSize=10`).expect(200)).body.data;
        seen.push(...r.items.map((m: { balanceAfter: number }) => m.balanceAfter));
      }
      expect(seen).toEqual(Array.from({ length: 23 }, (_, i) => 23 - i));
      expect((await history(id, "?page=4").expect(200)).body.data).toMatchObject({ items: [], total: 23, totalPages: 3 });
      expect((await history(id, "?pageSize=25").expect(200)).body.data.items).toHaveLength(23);
    });

    it("keeps a stable order when movements share a timestamp", async () => {
      const { id } = (await create().expect(201)).body.data;
      const same = new Date("2026-02-02T00:00:00Z");
      await connection.collection("stockMovements").insertMany(
        Array.from({ length: 12 }, (_, i) => ({
          productId: new Types.ObjectId(id),
          type: "ADJUSTMENT",
          quantity: 1,
          balanceAfter: i,
          createdAt: same,
        })),
      );
      const a = (await history(id, "?pageSize=10").expect(200)).body.data.items.map((m: { id: string }) => m.id);
      const b = (await history(id, "?pageSize=10&page=2").expect(200)).body.data.items.map((m: { id: string }) => m.id);
      expect(new Set([...a, ...b]).size).toBe(12);
    });

    it("only shows the product's own movements", async () => {
      const a = (await create({ name: "Product A", openingStock: 5 }).expect(201)).body.data.id;
      const b = (await create({ name: "Product B", openingStock: 9 }).expect(201)).body.data.id;
      expect((await history(a).expect(200)).body.data.items.map((m: { quantity: number }) => m.quantity)).toEqual([5]);
      expect((await history(b).expect(200)).body.data.items.map((m: { quantity: number }) => m.quantity)).toEqual([9]);
    });

    it("404s for unknown, malformed and deleted products", async () => {
      await history(MISSING).expect(404);
      await history("abc").expect(404);
      const { id } = (await create({ openingStock: 5 }).expect(201)).body.data;
      await api("delete", `/${id}`).expect(204);
      await history(id).expect(404);
    });

    it.each([["page=0"], ["page=abc"], ["page=1.5"], ["pageSize=5"], ["pageSize=100"], ["sort=name"], ["unknown=1"]])(
      "400s for bad query %s",
      async (query) => {
        const { id } = (await create().expect(201)).body.data;
        const res = await history(id, `?${query}`).expect(400);
        expect(res.body.code).toBe("VALIDATION_FAILED");
      },
    );

    it("requires sign-in", async () => {
      const { id } = (await create().expect(201)).body.data;
      await history(id, "", null).expect(401);
    });
  });
});
