import { BadRequestException, INestApplication, NotFoundException } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { type Connection, type Model, Types } from "mongoose";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { Product } from "../products/product.schema";
import { INSUFFICIENT_STOCK, InsufficientStockError } from "./stock.errors";
import { StockMovement } from "./stock-movement.schema";
import { StockModule } from "./stock.module";
import { type ApplyStock, StockService } from "./stock.service";

const actorId = new Types.ObjectId().toString();
const asProduct = (doc: Record<string, unknown>) => doc as Partial<Product>;

// Always the in-memory mock database (it runs as a replica set, so transactions work).
describe("StockService (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let products: Model<Product>;
  let movements: Model<StockMovement>;
  let stock: StockService;

  beforeAll(async () => {
    const env = validateEnv({ NODE_ENV: "test", DB_MODE: "mock", MOCK_DB_PATH: "", JWT_ACCESS_SECRET: "x".repeat(32) });
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, StockModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    products = app.get<Model<Product>>(getModelToken(Product.name));
    movements = app.get<Model<StockMovement>>(getModelToken(StockMovement.name));
    stock = app.get(StockService);
    await products.init();
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    jest.restoreAllMocks();
    await products.deleteMany({});
    await connection.collection("stockMovements").deleteMany({}); // the model refuses deletes by design
  });

  let n = 0;
  const makeProduct = async (qty = 0, over: Record<string, unknown> = {}) =>
    (
      await products.create(
        asProduct({ name: `Product ${++n}`, unit: "PIECE", unitPrice: 100, hsnCode: "1006", gstRate: 5, stock: { qtyOnHand: qty }, ...over }),
      )
    )._id;

  const apply = (input: Partial<ApplyStock> & Pick<ApplyStock, "productId" | "delta" | "type">) =>
    connection.transaction((session) => stock.apply(session, { actorId, ...input }));
  const balance = async (id: Types.ObjectId) => (await products.findById(id).lean())?.stock.qtyOnHand;
  const rows = (id: Types.ObjectId) => movements.find({ productId: id }).sort({ _id: 1 }).lean();

  it("adds stock and writes a movement with balanceAfter, actor, note and invoice", async () => {
    const id = await makeProduct(5);
    const invoiceId = new Types.ObjectId();
    const m = await apply({ productId: id, delta: 20, type: "STOCK_IN", note: "  delivery  ", invoiceId });
    expect(await balance(id)).toBe(25);
    expect(m).toMatchObject({ type: "STOCK_IN", quantity: 20, balanceAfter: 25, note: "delivery" });
    expect(String(m.invoiceId)).toBe(String(invoiceId));
    expect(String(m.createdBy)).toBe(actorId);
    expect((m as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
  });

  it("removes stock, down to exactly zero", async () => {
    const id = await makeProduct(10);
    await apply({ productId: id, delta: -4, type: "SALE" });
    await apply({ productId: id, delta: -6, type: "SALE" });
    expect(await balance(id)).toBe(0);
    expect((await rows(id)).map((r) => [r.quantity, r.balanceAfter])).toEqual([
      [-4, 6],
      [-6, 0],
    ]);
  });

  it("refuses one unit too many with 409 INSUFFICIENT_STOCK and writes nothing", async () => {
    const id = await makeProduct(3, { name: "Basmati Rice" });
    const err = await apply({ productId: id, delta: -4, type: "SALE" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(InsufficientStockError);
    const e = err as InsufficientStockError;
    expect(e.getStatus()).toBe(409);
    expect(e.getResponse()).toMatchObject({ code: INSUFFICIENT_STOCK, errors: ["Basmati Rice: 3 in stock, 4 requested"] });
    expect([e.productName, e.available, e.requested]).toEqual(["Basmati Rice", 3, 4]);
    expect(await balance(id)).toBe(3);
    expect(await movements.countDocuments()).toBe(0);
  });

  it("allows a negative adjustment within the balance, and refuses one beyond it", async () => {
    const id = await makeProduct(5);
    await apply({ productId: id, delta: -5, type: "ADJUSTMENT", note: "damaged" });
    await expect(apply({ productId: id, delta: -1, type: "ADJUSTMENT" })).rejects.toBeInstanceOf(InsufficientStockError);
    await apply({ productId: id, delta: 2, type: "ADJUSTMENT" });
    expect(await balance(id)).toBe(2);
  });

  it("404s for an unknown, malformed or deleted product, writing nothing", async () => {
    const gone = await makeProduct(5);
    await products.updateOne({ _id: gone }, { isDeleted: true, deletedAt: new Date() });
    for (const productId of [new Types.ObjectId(), "not-an-id", gone]) {
      await expect(apply({ productId, delta: 1, type: "STOCK_IN" })).rejects.toBeInstanceOf(NotFoundException);
      await expect(apply({ productId, delta: -1, type: "SALE" })).rejects.toBeInstanceOf(NotFoundException);
    }
    expect(await balance(gone)).toBe(5);
    expect(await movements.countDocuments()).toBe(0);
  });

  it("refuses zero, fractions and a wrong sign before touching the database", async () => {
    const id = await makeProduct(5);
    const spy = jest.spyOn(products, "findOneAndUpdate");
    for (const [delta, type] of [
      [0, "STOCK_IN"],
      [1.5, "STOCK_IN"],
      [Number.NaN, "ADJUSTMENT"],
      [-1, "STOCK_IN"],
      [-1, "OPENING"],
      [2, "SALE"],
      [2_000_000, "STOCK_IN"],
    ] as const) {
      await expect(apply({ productId: id, delta, type })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect(spy).not.toHaveBeenCalled();
    expect(await balance(id)).toBe(5);
  });

  it("rolls the balance back when the caller's transaction fails afterwards", async () => {
    const id = await makeProduct(5);
    await expect(
      connection.transaction(async (session) => {
        await stock.apply(session, { productId: id, delta: -2, type: "SALE", actorId });
        throw new Error("later step failed");
      }),
    ).rejects.toThrow("later step failed");
    expect(await balance(id)).toBe(5);
    expect(await movements.countDocuments()).toBe(0);
  });

  it("rolls the balance back when the movement cannot be written", async () => {
    const id = await makeProduct(5);
    jest.spyOn(movements, "create").mockRejectedValueOnce(new Error("disk full") as never);
    await expect(apply({ productId: id, delta: 3, type: "STOCK_IN" })).rejects.toThrow("disk full");
    expect(await balance(id)).toBe(5);
    expect(await movements.countDocuments()).toBe(0);
  });

  it("applies several changes in one transaction, all or nothing", async () => {
    const a = await makeProduct(5);
    const b = await makeProduct(1);
    await expect(
      connection.transaction(async (session) => {
        await stock.apply(session, { productId: a, delta: -2, type: "SALE", actorId });
        await stock.apply(session, { productId: b, delta: -2, type: "SALE", actorId }); // not enough
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect([await balance(a), await balance(b)]).toEqual([5, 1]);
    expect(await movements.countDocuments()).toBe(0);
  });

  it("20 parallel sales racing for 5 units: exactly 5 succeed, balance 0, 5 movements", async () => {
    const id = await makeProduct(5);
    const results = await Promise.allSettled(Array.from({ length: 20 }, () => apply({ productId: id, delta: -1, type: "SALE" })));
    const ok = results.filter((r) => r.status === "fulfilled");
    const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(ok).toHaveLength(5);
    expect(failed).toHaveLength(15);
    for (const f of failed) expect(f.reason).toBeInstanceOf(InsufficientStockError);
    expect(await balance(id)).toBe(0);
    const list = await rows(id);
    expect(list).toHaveLength(5);
    expect(list.map((r) => r.balanceAfter).sort((x, y) => y - x)).toEqual([4, 3, 2, 1, 0]);
  }, 60_000);

  it("keeps balanceAfter equal to the product balance after every step of a mixed run", async () => {
    const id = await makeProduct(0);
    const steps: Array<[number, "OPENING" | "STOCK_IN" | "SALE" | "SALE_CANCEL" | "ADJUSTMENT"]> = [
      [10, "OPENING"],
      [-3, "SALE"],
      [5, "STOCK_IN"],
      [-12, "SALE"],
      [3, "SALE_CANCEL"],
      [-1, "ADJUSTMENT"],
    ];
    for (const [delta, type] of steps) {
      const m = await apply({ productId: id, delta, type });
      expect(m.balanceAfter).toBe(await balance(id));
    }
    expect(await balance(id)).toBe(2);
    const list = await rows(id);
    expect(list.reduce((sum, r) => sum + r.quantity, 0)).toBe(2); // history adds up to the balance
  });

  it("works for an inactive product (only deleted ones are refused)", async () => {
    const id = await makeProduct(1, { isActive: false });
    await apply({ productId: id, delta: -1, type: "SALE" });
    expect(await balance(id)).toBe(0);
  });
});
