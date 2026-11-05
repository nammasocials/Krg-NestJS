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
import { Customer } from "./customer.schema";

const pad = (n: number) => String(n).padStart(2, "0");

/** n customers "Customer 01".."Customer n"; createdAt rises with n, so default order is n..1. */
const seed = (customers: Model<Customer>, n: number) =>
  customers.create(
    Array.from({ length: n }, (_, i) => ({
      name: `Customer ${pad(i + 1)}`,
      email: `c${pad(i + 1)}@example.com`,
      phone: `98765${String(10000 + i)}`,
      address: { line: "1 Road", city: "Mysuru", pincode: "570001" },
      gstin: `27AAAAA${String(1000 + i)}A1Z5`,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, 0, i)),
    })),
  );

describe("GET /customers (mock database)", () => {
  let app: INestApplication;
  let customers: Model<Customer>;
  let token: string;

  const get = (query = "", auth: string | null = token) => {
    const r = request(app.getHttpServer()).get(`/api/v1/customers${query}`);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const names = (res: request.Response): string[] => res.body.data.items.map((c: { name: string }) => c.name);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    customers = app.get<Model<Customer>>(getModelToken(Customer.name));
    await customers.init();
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
    await customers.deleteMany({});
  });

  it("requires sign-in", async () => {
    await get("", null).expect(401);
  });

  it("returns an empty page when there are no customers", async () => {
    const res = await get().expect(200);
    expect(res.body.data).toEqual({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 0 });
  });

  it("defaults to page 1, 10 per page, newest first", async () => {
    await seed(customers, 25);
    const res = await get().expect(200);
    expect(res.body.data).toMatchObject({ page: 1, pageSize: 10, total: 25, totalPages: 3 });
    expect(names(res)).toEqual(Array.from({ length: 10 }, (_, i) => `Customer ${pad(25 - i)}`));
  });

  it("returns list fields only, with hasLogo instead of logo data", async () => {
    await seed(customers, 2);
    await customers.updateOne({ name: "Customer 01" }, { logo: { fileId: "f1", mime: "image/png", size: 10 } });
    const res = await get("?sort=name").expect(200);
    const [first, second] = res.body.data.items;
    expect(first.hasLogo).toBe(true);
    expect(second.hasLogo).toBe(false);
    expect(Object.keys(first).sort()).toEqual(
      ["address", "createdAt", "email", "gstin", "hasLogo", "id", "name", "phone", "stateCode", "updatedAt"].sort(),
    );
    expect(first.stateCode).toBe("27");
  });

  it("serves the last (partial) page and an empty page beyond it", async () => {
    await seed(customers, 25);
    const last = await get("?page=3").expect(200);
    expect(last.body.data.items).toHaveLength(5);
    expect(names(last)).toEqual(["Customer 05", "Customer 04", "Customer 03", "Customer 02", "Customer 01"]);
    const beyond = await get("?page=4").expect(200);
    expect(beyond.body.data).toMatchObject({ items: [], page: 4, total: 25, totalPages: 3 });
  });

  it("honours pageSize 10, 25 and 50", async () => {
    await seed(customers, 30);
    expect((await get("?pageSize=25").expect(200)).body.data).toMatchObject({ pageSize: 25, totalPages: 2 });
    expect(names(await get("?pageSize=25").expect(200))).toHaveLength(25);
    expect(names(await get("?pageSize=50").expect(200))).toHaveLength(30);
    expect(names(await get("?pageSize=10").expect(200))).toHaveLength(10);
  });

  it("walks every customer exactly once across pages", async () => {
    await seed(customers, 23);
    const seen: string[] = [];
    for (const page of [1, 2, 3]) seen.push(...names(await get(`?page=${page}&sort=name`).expect(200)));
    expect(seen).toEqual(Array.from({ length: 23 }, (_, i) => `Customer ${pad(i + 1)}`));
  });

  it("sorts by name both ways, ignoring case", async () => {
    await customers.create(
      ["banana Ltd", "Apple Co", "cherry & Sons"].map((name, i) => ({
        name,
        email: `x${i}@example.com`,
        phone: "9876543210",
        address: { line: "1 Road", city: "Mysuru", pincode: "570001" },
        gstin: `27AAAAA000${i}A1Z5`,
      })),
    );
    expect(names(await get("?sort=name").expect(200))).toEqual(["Apple Co", "banana Ltd", "cherry & Sons"]);
    expect(names(await get("?sort=-name").expect(200))).toEqual(["cherry & Sons", "banana Ltd", "Apple Co"]);
  });

  it("sorts by creation time both ways", async () => {
    await seed(customers, 3);
    expect(names(await get("?sort=createdAt").expect(200))).toEqual(["Customer 01", "Customer 02", "Customer 03"]);
    expect(names(await get("?sort=-createdAt").expect(200))).toEqual(["Customer 03", "Customer 02", "Customer 01"]);
  });

  it("keeps a stable order when sort values tie", async () => {
    const same = new Date("2026-02-02T00:00:00Z");
    await customers.create(
      Array.from({ length: 12 }, (_, i) => ({
        name: "Same Name",
        email: `s${i}@example.com`,
        phone: "9876543210",
        address: { line: "1 Road", city: "Mysuru", pincode: "570001" },
        gstin: `27AAAAA${String(9000 + i)}A1Z5`,
        createdAt: same,
      })),
    );
    for (const sort of ["name", "-createdAt"]) {
      const a = (await get(`?sort=${sort}&pageSize=10`).expect(200)).body.data.items.map((c: { id: string }) => c.id);
      const b = (await get(`?sort=${sort}&pageSize=10&page=2`).expect(200)).body.data.items.map((c: { id: string }) => c.id);
      expect(new Set([...a, ...b]).size).toBe(12);
    }
  });

  describe("search", () => {
    beforeEach(async () => {
      await customers.create([
        {
          name: "Sri Lakshmi Traders",
          email: "accounts@lakshmi.example",
          phone: "9876543210",
          address: { line: "1 Road", city: "Mysuru", pincode: "570001" },
          gstin: "27AAPFU0939F1ZV",
        },
        {
          name: "Blue Star (India) & Co.",
          email: "hello@bluestar.example",
          phone: "9123456789",
          phoneAlt: "9000011111",
          address: { line: "2 Road", city: "Hubli", pincode: "580020" },
          gstin: "29ABCDE1234F1Z5",
        },
      ]);
    });

    it("matches name, case-insensitively and in the middle", async () => {
      expect(names(await get("?q=LAKSHMI").expect(200))).toEqual(["Sri Lakshmi Traders"]);
    });

    it("matches email", async () => {
      expect(names(await get("?q=bluestar.example").expect(200))).toEqual(["Blue Star (India) & Co."]);
    });

    it("matches phone, and the alternate phone", async () => {
      expect(names(await get("?q=98765").expect(200))).toEqual(["Sri Lakshmi Traders"]);
      expect(names(await get("?q=9000011").expect(200))).toEqual(["Blue Star (India) & Co."]);
    });

    it("matches a phone typed with +91, spaces or dashes", async () => {
      expect(names(await get("?q=" + encodeURIComponent("+91 98765-43210")).expect(200))).toEqual(["Sri Lakshmi Traders"]);
    });

    it("matches GSTIN in any case", async () => {
      expect(names(await get("?q=29abcde").expect(200))).toEqual(["Blue Star (India) & Co."]);
      expect(names(await get("?q=AAPFU0939").expect(200))).toEqual(["Sri Lakshmi Traders"]);
    });

    it("treats regex characters literally", async () => {
      expect(names(await get("?q=" + encodeURIComponent("(India) & Co.")).expect(200))).toEqual(["Blue Star (India) & Co."]);
      for (const q of [".*", "((", "[a-z]", "\\", "a|b", "^Sri", "Traders$"]) {
        const res = await get("?q=" + encodeURIComponent(q)).expect(200);
        expect(res.body.data.total).toBe(0);
      }
    });

    it("trims the text and ignores a blank one", async () => {
      expect(names(await get("?q=" + encodeURIComponent("  lakshmi  ")).expect(200))).toEqual(["Sri Lakshmi Traders"]);
      expect((await get("?q=%20%20").expect(200)).body.data.total).toBe(2);
      expect((await get("?q=").expect(200)).body.data.total).toBe(2);
    });

    it("counts matches in total and totalPages", async () => {
      const res = await get("?q=example").expect(200);
      expect(res.body.data).toMatchObject({ total: 2, totalPages: 1 });
    });

    it("returns nothing for text that matches nobody", async () => {
      expect((await get("?q=zzzz").expect(200)).body.data).toMatchObject({ items: [], total: 0, totalPages: 0 });
    });
  });

  it("hides deleted customers from items and totals", async () => {
    await seed(customers, 3);
    await customers.updateOne({ name: "Customer 02" }, { isDeleted: true, deletedAt: new Date() });
    const res = await get().expect(200);
    expect(res.body.data.total).toBe(2);
    expect(names(res)).toEqual(["Customer 03", "Customer 01"]);
    expect((await get("?q=Customer 02").expect(200)).body.data.total).toBe(0);
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
    ["sort=email"],
    ["sort=-phone"],
    ["sort=name,createdAt"],
    ["sort=%24where"],
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

  it("works for an ADMIN too (any signed-in user)", async () => {
    await seed(customers, 1);
    const res = await get().expect(200);
    expect(res.body.data.total).toBe(1);
  });
});
