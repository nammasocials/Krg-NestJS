import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { type Connection, type Model, Types } from "mongoose";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { StockMovement } from "./stock-movement.schema";
import { StockModule } from "./stock.module";

const productId = new Types.ObjectId();
const valid = { productId, type: "STOCK_IN", quantity: 10, balanceAfter: 10 };
const asMovement = (doc: Record<string, unknown>) => doc as Partial<StockMovement>;

// Always the in-memory mock database; the startup runs the real migrations.
describe("stockMovements collection (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let model: Model<StockMovement>;

  beforeAll(async () => {
    const env = validateEnv({ NODE_ENV: "test", DB_MODE: "mock", MOCK_DB_PATH: "", JWT_ACCESS_SECRET: "x".repeat(32) });
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, StockModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    model = app.get<Model<StockMovement>>(getModelToken(StockMovement.name));
    await model.init();
  }, 300_000);

  const make = (doc: Record<string, unknown>) => model.create(asMovement(doc));

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    // The model refuses deletes by design; tests clear the raw collection.
    await connection.collection("stockMovements").deleteMany({});
  });

  it("the migration created the indexes", async () => {
    const indexes = await connection.collection("stockMovements").indexes();
    const byName = Object.fromEntries(indexes.map((i) => [i.name!, i]));
    expect(byName.productId_createdAt_id_desc.key).toEqual({ productId: 1, createdAt: -1, _id: -1 });
    expect(byName.invoiceId_sparse).toMatchObject({ key: { invoiceId: 1 }, sparse: true });
  });

  it("stores a movement with a creation time only, and toJSON gives id", async () => {
    const m = await make({ ...valid, note: "  first delivery  ", invoiceId: new Types.ObjectId() });
    expect(m.note).toBe("first delivery");
    const json = m.toJSON() as unknown as Record<string, unknown>;
    expect(typeof json.id).toBe("string");
    expect(json).not.toHaveProperty("_id");
    expect(json.createdAt).toBeInstanceOf(Date);
    expect(json).not.toHaveProperty("updatedAt");
  });

  it("accepts each type with a matching sign", async () => {
    for (const [type, quantity] of [
      ["OPENING", 5],
      ["STOCK_IN", 5],
      ["SALE_CANCEL", 2],
      ["SALE", -3],
      ["ADJUSTMENT", 4],
      ["ADJUSTMENT", -4],
    ] as const) {
      await expect(make({ ...valid, type, quantity })).resolves.toBeDefined();
    }
  });

  it("rejects zero, fractions and wrongly signed quantities", async () => {
    const bad: Array<Record<string, unknown>> = [
      { ...valid, quantity: 0 },
      { ...valid, quantity: 1.5 },
      { ...valid, quantity: undefined },
      { ...valid, type: "SALE", quantity: 3 },
      { ...valid, type: "OPENING", quantity: -3 },
      { ...valid, type: "STOCK_IN", quantity: -1 },
      { ...valid, type: "SALE_CANCEL", quantity: -1 },
      { ...valid, quantity: 1_000_001 },
    ];
    for (const doc of bad) await expect(make(doc)).rejects.toThrow();
  });

  it("rejects an unknown type, a missing product, a negative or fractional balance and a long note", async () => {
    const bad: Array<Record<string, unknown>> = [
      { ...valid, type: "REFUND" },
      { ...valid, type: undefined },
      { ...valid, productId: undefined },
      { ...valid, balanceAfter: -1 },
      { ...valid, balanceAfter: 2.5 },
      { ...valid, balanceAfter: undefined },
      { ...valid, note: "x".repeat(201) },
    ];
    for (const doc of bad) await expect(make(doc)).rejects.toThrow();
  });

  describe("append-only", () => {
    it("refuses to save changes to an existing movement", async () => {
      const m = await make(valid);
      m.quantity = 99;
      await expect(m.save()).rejects.toThrow(/append-only/);
      expect((await model.findById(m._id).lean())?.quantity).toBe(10);
    });

    it("refuses updates, replaces and deletes through the model", async () => {
      const m = await make(valid);
      await expect(model.updateOne({ _id: m._id }, { quantity: 1 })).rejects.toThrow(/append-only/);
      await expect(model.updateMany({}, { note: "x" })).rejects.toThrow(/append-only/);
      await expect(model.findOneAndUpdate({ _id: m._id }, { note: "x" })).rejects.toThrow(/append-only/);
      await expect(model.replaceOne({ _id: m._id }, valid)).rejects.toThrow(/append-only/);
      await expect(model.deleteOne({ _id: m._id })).rejects.toThrow(/append-only/);
      await expect(model.deleteMany({})).rejects.toThrow(/append-only/);
      await expect(model.findOneAndDelete({ _id: m._id })).rejects.toThrow(/append-only/);
      await expect(m.deleteOne()).rejects.toThrow(/append-only/);
      expect(await model.countDocuments()).toBe(1);
      expect((await model.findById(m._id).lean())?.quantity).toBe(10);
    });
  });

  it("is safe to run the migration twice and can roll it back", async () => {
    const file = "../../migrations/20261109100000-create-stock-movements.mjs"; // a variable: the .mjs file has no types
    const { up, down } = (await import(file)) as {
      up: (db: unknown) => Promise<void>;
      down: (db: unknown) => Promise<void>;
    };
    const db = connection.db!;
    await up(db);
    await up(db);
    await down(db);
    expect((await db.listCollections({ name: "stockMovements" }).toArray()).length).toBe(0);
    await down(db); // already gone: no error
    await up(db); // leave it as the other tests expect
    expect((await db.collection("stockMovements").indexes()).map((i) => i.name)).toContain("productId_createdAt_id_desc");
  });
});
