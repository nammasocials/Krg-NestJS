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
import { Product } from "./product.schema";

const pad = (n: number) => String(n).padStart(2, "0");

type Seed = Record<string, unknown>;
const make = (over: Seed): Partial<Product> =>
  ({ unit: "PIECE", unitPrice: 1000, hsnCode: "1006", gstRate: 5, ...over }) as Partial<Product>;

/** n products "Product 01".."Product n"; createdAt rises with n, so default order is n..1. */
const seed = (products: Model<Product>, n: number) =>
  products.create(
    Array.from({ length: n }, (_, i) =>
      make({ name: `Product ${pad(i + 1)}`, unitPrice: (i + 1) * 100, createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)) }),
    ),
  );

describe("GET /products (mock database)", () => {
  let app: INestApplication;
  let products: Model<Product>;
  let token: string;

  const get = (query = "", auth: string | null = token) => {
    const r = request(app.getHttpServer()).get(`/api/v1/products${query}`);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const names = (res: request.Response): string[] => res.body.data.items.map((p: { name: string }) => p.name);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    products = app.get<Model<Product>>(getModelToken(Product.name));
    await products.init();
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "AdminPass#1" })
      .expect(200);
    token = res.body.data.accessToken;
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    await products.deleteMany({});
  });

  it("requires sign-in", async () => {
    await get("", null).expect(401);
    await get("", "not-a-token").expect(401);
  });

  it("returns an empty page when there are no products", async () => {
    const res = await get().expect(200);
    expect(res.body.data).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
  });

  it("defaults to page 1, 10 per page, newest first", async () => {
    await seed(products, 25);
    const res = await get().expect(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    expect(names(res)).toEqual(Array.from({ length: 10 }, (_, i) => `Product ${pad(25 - i)}`));
  });

  it("returns list fields only, with hasImage instead of image data", async () => {
    await seed(products, 2);
    await products.updateOne({ name: "Product 01" }, { image: { fileId: "f1", mime: "image/png", size: 10 } });
    await products.updateOne({ name: "Product 02" }, { "stock.qtyOnHand": 7, isActive: false });
    const res = await get("?sort=name").expect(200);
    const [first, second] = res.body.data.items;
    expect(first.hasImage).toBe(true);
    expect(second.hasImage).toBe(false);
    expect(second).toMatchObject({ stock: { qtyOnHand: 7 }, isActive: false, unit: "PIECE", unitPrice: 200, hsnCode: "1006", gstRate: 5 });
    expect(Object.keys(first).sort()).toEqual(
      ["createdAt", "gstRate", "hasImage", "hsnCode", "id", "isActive", "name", "stock", "unit", "unitPrice", "updatedAt"].sort(),
    );
    expect(first.stock).toEqual({ qtyOnHand: 0 });
  });

  it("serves the last (partial) page and an empty page beyond it", async () => {
    await seed(products, 25);
    const last = await get("?page=3").expect(200);
    expect(names(last)).toEqual(["Product 05", "Product 04", "Product 03", "Product 02", "Product 01"]);
    const beyond = await get("?page=4").expect(200);
    expect(beyond.body.data).toMatchObject({ items: [], page: 4, total: 25, totalPages: 3 });
  });

  it("honours pageSize 10, 25 and 50", async () => {
    await seed(products, 30);
    expect((await get("?pageSize=25").expect(200)).body.data).toMatchObject({ pageSize: 25, totalPages: 2 });
    expect(names(await get("?pageSize=25").expect(200))).toHaveLength(25);
    expect(names(await get("?pageSize=50").expect(200))).toHaveLength(30);
    expect(names(await get("?pageSize=10").expect(200))).toHaveLength(10);
  });

  it("walks every product exactly once across pages", async () => {
    await seed(products, 23);
    const seen: string[] = [];
    for (const page of [1, 2, 3]) seen.push(...names(await get(`?page=${page}&sort=name`).expect(200)));
    expect(seen).toEqual(Array.from({ length: 23 }, (_, i) => `Product ${pad(i + 1)}`));
  });

  describe("sorting", () => {
    it("by name both ways, ignoring case", async () => {
      await products.create(["banana", "Apple", "cherry"].map((name) => make({ name })));
      expect(names(await get("?sort=name").expect(200))).toEqual(["Apple", "banana", "cherry"]);
      expect(names(await get("?sort=-name").expect(200))).toEqual(["cherry", "banana", "Apple"]);
    });

    it("by price both ways, lowest and highest first", async () => {
      await products.create([
        make({ name: "Mid", unitPrice: 5000 }),
        make({ name: "Free", unitPrice: 0 }),
        make({ name: "Top", unitPrice: 99900 }),
      ]);
      expect(names(await get("?sort=unitPrice").expect(200))).toEqual(["Free", "Mid", "Top"]);
      expect(names(await get("?sort=-unitPrice").expect(200))).toEqual(["Top", "Mid", "Free"]);
    });

    it("by creation time both ways", async () => {
      await seed(products, 3);
      expect(names(await get("?sort=createdAt").expect(200))).toEqual(["Product 01", "Product 02", "Product 03"]);
      expect(names(await get("?sort=-createdAt").expect(200))).toEqual(["Product 03", "Product 02", "Product 01"]);
    });

    it("keeps a stable order when sort values tie (same price, same time)", async () => {
      const same = new Date("2026-02-02T00:00:00Z");
      await products.create(Array.from({ length: 12 }, (_, i) => make({ name: `Item ${pad(i)}`, unitPrice: 500, createdAt: same })));
      for (const sort of ["unitPrice", "-unitPrice", "createdAt", "-createdAt"]) {
        const a = (await get(`?sort=${sort}&pageSize=10`).expect(200)).body.data.items.map((p: { id: string }) => p.id);
        const b = (await get(`?sort=${sort}&pageSize=10&page=2`).expect(200)).body.data.items.map((p: { id: string }) => p.id);
        expect(new Set([...a, ...b]).size).toBe(12);
      }
    });
  });

  describe("search", () => {
    beforeEach(async () => {
      await products.create([
        make({ name: "Basmati Rice 25kg", hsnCode: "10063020" }),
        make({ name: "Blue Star (Deluxe) Soap & Co.", hsnCode: "340111" }),
        make({ name: "Sunflower Oil", hsnCode: "1512" }),
      ]);
    });

    it("matches name, case-insensitively and in the middle", async () => {
      expect(names(await get("?q=RICE").expect(200))).toEqual(["Basmati Rice 25kg"]);
      expect(names(await get("?q=flower").expect(200))).toEqual(["Sunflower Oil"]);
    });

    it("matches HSN code, by any part of it", async () => {
      expect(names(await get("?q=340111").expect(200))).toEqual(["Blue Star (Deluxe) Soap & Co."]);
      expect(names(await get("?q=1512").expect(200))).toEqual(["Sunflower Oil"]);
      expect(names(await get("?q=1006").expect(200))).toEqual(["Basmati Rice 25kg"]);
    });

    it("treats regex characters literally", async () => {
      expect(names(await get("?q=" + encodeURIComponent("(Deluxe) Soap & Co.")).expect(200))).toEqual(["Blue Star (Deluxe) Soap & Co."]);
      for (const q of [".*", "((", "[a-z]", "\\", "a|b", "^Basmati", "Oil$"]) {
        expect((await get("?q=" + encodeURIComponent(q)).expect(200)).body.data.total).toBe(0);
      }
    });

    it("trims the text and ignores a blank one", async () => {
      expect(names(await get("?q=" + encodeURIComponent("  sunflower  ")).expect(200))).toEqual(["Sunflower Oil"]);
      expect((await get("?q=%20%20").expect(200)).body.data.total).toBe(3);
      expect((await get("?q=").expect(200)).body.data.total).toBe(3);
    });

    it("counts matches in total and totalPages, and finds nothing for unknown text", async () => {
      expect((await get("?q=e").expect(200)).body.data.total).toBe(3);
      expect((await get("?q=zzzz").expect(200)).body.data).toMatchObject({ items: [], total: 0, totalPages: 0 });
    });

    it("works together with sort, paging and the active filter", async () => {
      await products.updateOne({ name: "Sunflower Oil" }, { isActive: false });
      expect(names(await get("?q=e&active=true&sort=name").expect(200))).toEqual(["Basmati Rice 25kg", "Blue Star (Deluxe) Soap & Co."]);
      expect(names(await get("?q=e&active=false").expect(200))).toEqual(["Sunflower Oil"]);
    });
  });

  describe("active filter", () => {
    beforeEach(async () => {
      await products.create([
        make({ name: "Live One" }),
        make({ name: "Live Two" }),
        make({ name: "Resting", isActive: false }),
      ]);
    });

    it("defaults to both, and `all` is the same", async () => {
      expect((await get().expect(200)).body.data.total).toBe(3);
      expect((await get("?active=all").expect(200)).body.data.total).toBe(3);
    });

    it("shows only active, or only inactive, with matching totals", async () => {
      const on = await get("?active=true&sort=name").expect(200);
      expect(names(on)).toEqual(["Live One", "Live Two"]);
      expect(on.body.data.total).toBe(2);
      const off = await get("?active=false").expect(200);
      expect(names(off)).toEqual(["Resting"]);
      expect(off.body.data.items[0].isActive).toBe(false);
    });
  });

  it("hides deleted products from items and totals, even inactive ones", async () => {
    await seed(products, 3);
    await products.updateOne({ name: "Product 02" }, { isDeleted: true, deletedAt: new Date(), isActive: false });
    const res = await get().expect(200);
    expect(res.body.data.total).toBe(2);
    expect(names(res)).toEqual(["Product 03", "Product 01"]);
    expect((await get("?q=Product 02").expect(200)).body.data.total).toBe(0);
    expect((await get("?active=false").expect(200)).body.data.total).toBe(0);
  });

  it.each([
    ["page=0"],
    ["page=-1"],
    ["page=abc"],
    ["page=1.5"],
    ["page=1000000"],
    ["pageSize=5"],
    ["pageSize=100"],
    ["pageSize=abc"],
    ["sort=hsnCode"],
    ["sort=-stock"],
    ["sort=name,createdAt"],
    ["sort=%24where"],
    ["active=yes"],
    ["active=TRUE"],
    ["active=1"],
    ["q=" + "a".repeat(101)],
    ["unknown=1"],
  ])("rejects bad query %s with 400", async (query) => {
    const res = await get(`?${query}`).expect(400);
    expect(res.body.code).toBe("VALIDATION_FAILED");
    expect(res.body.data.errors.length).toBeGreaterThan(0);
  });

  it("rejects a repeated q", async () => {
    await get("?q=a&q=b").expect(400);
  });
});
