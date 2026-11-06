import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { type Connection, type Model } from "mongoose";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { Product } from "./product.schema";
import { ProductsModule } from "./products.module";

const valid = {
  name: "  Basmati Rice 25kg  ",
  unit: "PACK",
  unitPrice: 125050,
  hsnCode: "10063020",
  gstRate: 5,
};

const asProduct = (doc: Record<string, unknown>) => doc as Partial<Product>;

// Always the in-memory mock database; the startup runs the real migrations.
describe("products collection (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let model: Model<Product>;

  beforeAll(async () => {
    const env = validateEnv({ NODE_ENV: "test", DB_MODE: "mock", MOCK_DB_PATH: "", JWT_ACCESS_SECRET: "x".repeat(32) });
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, ProductsModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    model = app.get<Model<Product>>(getModelToken(Product.name));
    await model.init();
  }, 300_000);

  const make = (doc: Record<string, unknown>) => model.create(asProduct(doc));

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    await model.deleteMany({});
  });

  it("the migration created the indexes", async () => {
    const indexes = await connection.collection("products").indexes();
    const byName = Object.fromEntries(indexes.map((i) => [i.name!, i]));
    expect(byName.nameLower_unique_active).toMatchObject({
      key: { nameLower: 1 },
      unique: true,
      partialFilterExpression: { isDeleted: false, nameLower: { $type: "string" } },
    });
    expect(byName.nameLower_id.key).toEqual({ nameLower: 1, _id: 1 });
    expect(byName.createdAt_id_desc.key).toEqual({ createdAt: -1, _id: -1 });
    expect(byName.isDeleted_isActive.key).toEqual({ isDeleted: 1, isActive: 1 });
  });

  it("applies the defaults and derives nameLower", async () => {
    const p = await make(valid);
    expect(p.name).toBe("Basmati Rice 25kg");
    expect(p.nameLower).toBe("basmati rice 25kg");
    expect(p.stock.qtyOnHand).toBe(0);
    expect(p.isActive).toBe(true);
    expect(p.isDeleted).toBe(false);
    expect(p.image).toBeUndefined();
    expect((p as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
  });

  it("keeps nameLower in step when the name changes", async () => {
    const p = await make(valid);
    p.name = "Sona Masoori";
    await p.save();
    expect((await model.findById(p._id))?.nameLower).toBe("sona masoori");
  });

  it("toJSON gives id and hides _id, nameLower and __v", async () => {
    const json = (await make(valid)).toJSON() as unknown as Record<string, unknown>;
    expect(typeof json.id).toBe("string");
    for (const hidden of ["_id", "nameLower", "__v"]) expect(json).not.toHaveProperty(hidden);
    expect(json).toMatchObject({ unit: "PACK", unitPrice: 125050, hsnCode: "10063020", gstRate: 5, stock: { qtyOnHand: 0 } });
  });

  it("rejects values outside the rules", async () => {
    const bad: Array<Record<string, unknown>> = [
      { ...valid, name: "A" },
      { ...valid, name: "x".repeat(101) },
      { ...valid, name: undefined },
      { ...valid, unit: "BOX" },
      { ...valid, unit: undefined },
      { ...valid, unitPrice: -1 },
      { ...valid, unitPrice: 10.5 },
      { ...valid, unitPrice: undefined },
      { ...valid, hsnCode: "123" },
      { ...valid, hsnCode: "12345" },
      { ...valid, hsnCode: "ABCD" },
      { ...valid, gstRate: 7 },
      { ...valid, gstRate: undefined },
      { ...valid, stock: { qtyOnHand: -1 } },
      { ...valid, stock: { qtyOnHand: 1.5 } },
    ];
    for (const doc of bad) await expect(make(doc)).rejects.toThrow();
  });

  it("allows a zero price and every GST slab", async () => {
    await expect(make({ ...valid, name: "Free Sample", unitPrice: 0 })).resolves.toBeDefined();
    for (const [i, gstRate] of [0, 0.25, 3, 5, 12, 18, 28].entries()) {
      await expect(make({ ...valid, name: `Slab ${i}`, gstRate })).resolves.toBeDefined();
    }
  });

  it("allows one active product per name (any letter case), and the name again after a soft delete", async () => {
    const first = await make(valid);
    await expect(make({ ...valid, name: "BASMATI RICE 25KG" })).rejects.toMatchObject({ code: 11000 });

    first.isDeleted = true;
    first.deletedAt = new Date();
    await first.save();

    await expect(make({ ...valid, name: "basmati rice 25kg" })).resolves.toBeDefined();
    // Two deleted products may share a name as well; so may an inactive one with a deleted one.
    const again = await model.findOne({ isDeleted: false });
    again!.isDeleted = true;
    await again!.save();
    await expect(make(valid)).resolves.toBeDefined();
  });

  it("an inactive product still holds its name", async () => {
    await make({ ...valid, isActive: false });
    await expect(make(valid)).rejects.toMatchObject({ code: 11000 });
  });

  it("is safe to run the migration twice and can roll it back", async () => {
    const file = "../../migrations/20261106100000-create-products.mjs"; // a variable: the .mjs file has no types
    const { up, down } = (await import(file)) as {
      up: (db: unknown) => Promise<void>;
      down: (db: unknown) => Promise<void>;
    };
    const db = connection.db!;
    await up(db);
    await up(db);
    await down(db);
    expect((await db.listCollections({ name: "products" }).toArray()).length).toBe(0);
    await down(db); // already gone: no error
    await up(db); // leave it as the other tests expect
    expect((await db.collection("products").indexes()).map((i) => i.name)).toContain("nameLower_unique_active");
  });
});
