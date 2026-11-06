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

describe("POST /products (mock database)", () => {
  let app: INestApplication;
  let products: Model<Product>;
  let logs: Model<AuditLog>;
  let token: string;
  let adminId: string;

  const post = (payload: unknown, auth: string | null = token, extra: Record<string, string> = {}) => {
    const r = request(app.getHttpServer()).post("/api/v1/products").set(extra);
    return (auth ? r.set("Authorization", `Bearer ${auth}`) : r).send(payload as object);
  };
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

  it("creates a product: 201, trimmed name, 0 on hand, active, no internal fields", async () => {
    const res = await post(body({ name: "  Basmati Rice 25kg  " })).expect(201);
    expect(res.body.code).toBe("OK");
    expect(res.body.data).toMatchObject({
      name: "Basmati Rice 25kg",
      unit: "PACK",
      unitPrice: 125050,
      hsnCode: "10063020",
      gstRate: 5,
      stock: { qtyOnHand: 0 },
      isActive: true,
      isDeleted: false,
      createdBy: adminId,
      updatedBy: adminId,
    });
    expect(typeof res.body.data.id).toBe("string");
    for (const hidden of ["_id", "nameLower", "__v"]) expect(res.body.data).not.toHaveProperty(hidden);
    expect(await products.countDocuments()).toBe(1);
  });

  it("accepts a zero price, every unit, every GST slab and 4, 6 and 8 digit HSN codes", async () => {
    await post(body({ name: "Free Sample", unitPrice: 0 })).expect(201);
    await post(body({ name: "Single", unit: "PIECE" })).expect(201);
    for (const [i, gstRate] of [0, 0.25, 3, 5, 12, 18, 28].entries()) await post(body({ name: `Slab ${i}`, gstRate })).expect(201);
    for (const [i, hsnCode] of ["1006", "100630", "10063020"].entries()) await post(body({ name: `Hsn ${i}`, hsnCode })).expect(201);
  });

  it("accepts names with digits, punctuation and other scripts", async () => {
    for (const name of ["Bag 25kg", "Soap (Lux) 100g & Co.", "Oil 5% + Gift", "श्री गणेश अगरबत्ती", "ಕಾವೇರಿ ಎಣ್ಣೆ"]) {
      await post(body({ name })).expect(201);
    }
  });

  describe("validation: all problems at once, each starting with the field", () => {
    it("rejects every invalid field", async () => {
      const res = await post({ name: "A", unit: "BOX", unitPrice: -5, hsnCode: "12", gstRate: 7 }).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      const errors = errorsOf(res);
      for (const field of ["name", "unit", "unitPrice", "hsnCode", "gstRate"]) {
        expect(errors.some((e) => e.startsWith(field))).toBe(true);
      }
    });

    it("rejects an empty body with every field listed", async () => {
      const errors = errorsOf(await post({}).expect(400));
      for (const field of ["name", "unit", "unitPrice", "hsnCode", "gstRate"]) {
        expect(errors.some((e) => e.startsWith(field))).toBe(true);
      }
    });

    it.each([
      ["name too short", { name: "A" }, "name"],
      ["name too long", { name: "x".repeat(101) }, "name"],
      ["name starts with punctuation", { name: "-Rice" }, "name"],
      ["name with a forbidden character", { name: "Rice @ Home" }, "name"],
      ["name not a string", { name: 5 }, "name"],
      ["unit lower-case", { unit: "piece" }, "unit"],
      ["unit unknown", { unit: "BOX" }, "unit"],
      ["price as text", { unitPrice: "100" }, "unitPrice"],
      ["price with a fraction", { unitPrice: 10.5 }, "unitPrice"],
      ["price negative", { unitPrice: -1 }, "unitPrice"],
      ["price too large", { unitPrice: 100_000_000_000 }, "unitPrice"],
      ["price null", { unitPrice: null }, "unitPrice"],
      ["hsn too short", { hsnCode: "123" }, "hsnCode"],
      ["hsn five digits", { hsnCode: "12345" }, "hsnCode"],
      ["hsn with letters", { hsnCode: "10A6" }, "hsnCode"],
      ["gst not a slab", { gstRate: 7 }, "gstRate"],
      ["gst as text", { gstRate: "18" }, "gstRate"],
      ["gst negative", { gstRate: -5 }, "gstRate"],
    ])("%s", async (_label, over, field) => {
      const res = await post(body(over)).expect(400);
      expect(errorsOf(res).some((e) => e.startsWith(field))).toBe(true);
      expect(await products.countDocuments()).toBe(0);
    });

    it.each([
      ["stock", { stock: { qtyOnHand: 50 } }],
      ["isActive", { isActive: false }],
      ["isDeleted", { isDeleted: true }],
      ["nameLower", { nameLower: "x" }],
      ["createdBy", { createdBy: "65a000000000000000000000" }],
      ["an unknown field", { colour: "red" }],
    ])("does not accept %s from the caller", async (field, over) => {
      const res = await post(body(over)).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(await products.countDocuments()).toBe(0);
      expect(field).toBeTruthy();
    });
  });

  describe("duplicate names", () => {
    it("gives 409 PRODUCT_NAME_EXISTS for the same name in any letter case", async () => {
      await post(body()).expect(201);
      for (const name of ["Basmati Rice 25kg", "BASMATI RICE 25KG", "  basmati rice 25kg "]) {
        const res = await post(body({ name })).expect(409);
        expect(res.body.code).toBe(PRODUCT_NAME_EXISTS);
        expect(errorsOf(res)).toEqual(["name is already used by another product"]);
      }
      expect(await products.countDocuments()).toBe(1);
    });

    it("an inactive product still holds its name", async () => {
      await products.create({ ...body(), isActive: false } as Partial<Product>);
      await post(body()).expect(409);
    });

    it("a soft-deleted product frees its name", async () => {
      await post(body()).expect(201);
      await products.updateMany({}, { isDeleted: true, deletedAt: new Date() });
      await post(body()).expect(201);
    });

    it("parallel creates with one name leave one product and one audit row", async () => {
      const results = await Promise.all(Array.from({ length: 6 }, () => post(body())));
      expect(results.filter((r) => r.status === 201)).toHaveLength(1);
      expect(results.filter((r) => r.status === 409)).toHaveLength(5);
      expect(await products.countDocuments()).toBe(1);
      expect(await logs.countDocuments({ entity: "product" })).toBe(1);
    });
  });

  describe("audit", () => {
    it("writes one CREATE row with the actor and the request id, and no secrets or before-state", async () => {
      const res = await post(body(), token, { "X-Request-Id": "product-create-0001" }).expect(201);
      const rows = await logs.find({ entity: "product" }).lean();
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        entity: "product",
        entityId: res.body.data.id,
        action: "CREATE",
        requestId: "product-create-0001",
      });
      expect(String(rows[0].actorId)).toBe(adminId);
      expect(rows[0].before).toBeUndefined();
      expect(rows[0].after).toMatchObject({ name: "Basmati Rice 25kg", unitPrice: 125050, gstRate: 5 });
      expect(rows[0].changedFields).toEqual(expect.arrayContaining(["name", "unit", "unitPrice", "hsnCode", "gstRate"]));
    });

    it("a failed audit write leaves no product", async () => {
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await post(body()).expect(500);
      expect(await products.countDocuments()).toBe(0);
      expect(await logs.countDocuments()).toBe(0);
    });

    it("a rejected request writes no audit row", async () => {
      await post(body({ gstRate: 7 })).expect(400);
      expect(await logs.countDocuments()).toBe(0);
    });
  });

  describe("sign-in", () => {
    it("needs a token", async () => {
      await post(body(), null).expect(401);
      expect(await products.countDocuments()).toBe(0);
    });

    it("refuses a bad token", async () => {
      await post(body(), "not-a-token").expect(401);
    });
  });
});
