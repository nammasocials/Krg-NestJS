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
import { PasswordService } from "../auth/password.service";
import { User } from "../users/user.schema";
import { Customer } from "./customer.schema";
import { GSTIN_EXISTS } from "./customers.service";

const GSTIN = "27AAPFU0939F1ZV";
const body = (over: Record<string, unknown> = {}) => ({
  name: "Sri Lakshmi Traders",
  email: "accounts@example.com",
  phone: "9876543210",
  address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
  gstin: GSTIN,
  ...over,
});

describe("POST /customers (mock database)", () => {
  let app: INestApplication;
  let customers: Model<Customer>;
  let token: string;
  let adminToken: string;
  let adminId: string;

  const post = (payload: unknown, auth: string | null = token) => {
    const r = request(app.getHttpServer()).post("/api/v1/customers").send(payload as object);
    return auth ? r.set("Authorization", `Bearer ${auth}`) : r;
  };
  const errorsOf = (res: request.Response): string[] => res.body.data?.errors ?? [];

  async function login(username: string, password: string) {
    const res = await request(app.getHttpServer()).post("/api/v1/auth/login").send({ username, password }).expect(200);
    return { token: res.body.data.accessToken as string, id: res.body.data.user.id as string };
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    customers = app.get<Model<Customer>>(getModelToken(Customer.name));
    await customers.init();

    const users = app.get<Model<User>>(getModelToken(User.name));
    await users.create({
      username: "staff01",
      passwordHash: await app.get(PasswordService).hash("StaffPass#1"),
      fullName: "Staff",
      role: "ADMIN",
    });
    const superAdmin = await login("admin", "AdminPass#1");
    token = superAdmin.token;
    adminId = superAdmin.id;
    adminToken = (await login("staff01", "StaffPass#1")).token;
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    await customers.deleteMany({});
  });

  it("creates a customer and returns it with the derived state code", async () => {
    const res = await post(body()).expect(201);
    expect(res.body.code).toBe("OK");
    expect(res.body.data).toMatchObject({
      name: "Sri Lakshmi Traders",
      email: "accounts@example.com",
      phone: "9876543210",
      address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
      gstin: GSTIN,
      stateCode: "27",
      isDeleted: false,
      createdBy: adminId,
      updatedBy: adminId,
    });
    expect(typeof res.body.data.id).toBe("string");
    expect(res.body.data).not.toHaveProperty("_id");
    expect(res.body.data).not.toHaveProperty("nameLower");
    expect(res.body.data.createdAt).toBeTruthy();
    expect(await customers.countDocuments()).toBe(1);
  });

  it("lets an ADMIN create customers too", async () => {
    await post(body(), adminToken).expect(201);
  });

  it("normalises text: trims, lower-cases the email, upper-cases the GSTIN, strips phone prefixes", async () => {
    const res = await post(
      body({
        name: "  Acme & Sons (Pvt.) Ltd  ",
        email: "  Accounts@Example.COM ",
        phone: "+91 98765-43210",
        phoneAlt: "09123456780",
        gstin: " 27aapfu0939f1zv ",
        address: { line: "  12 Market Road ", city: " Mysuru ", pincode: " 570001 " },
      }),
    ).expect(201);
    expect(res.body.data).toMatchObject({
      name: "Acme & Sons (Pvt.) Ltd",
      email: "accounts@example.com",
      phone: "9876543210",
      phoneAlt: "9123456780",
      gstin: GSTIN,
      address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
    });
  });

  it("accepts names that the old system rejected (digits, ampersand)", async () => {
    await post(body({ name: "A1 Traders & Sons" })).expect(201);
  });

  it("treats an empty alternate phone as not given", async () => {
    const res = await post(body({ phoneAlt: "" })).expect(201);
    expect(res.body.data).not.toHaveProperty("phoneAlt");
  });

  describe("validation: VALIDATION_FAILED with one message per field, naming the field", () => {
    const cases: Array<[string, Record<string, unknown>, string]> = [
      ["missing name", { name: undefined }, "name"],
      ["one-letter name", { name: "A" }, "name"],
      ["101-character name", { name: "x".repeat(101) }, "name"],
      ["name starting with punctuation", { name: "&Traders" }, "name"],
      ["name with markup", { name: "<script>alert(1)</script>" }, "name"],
      ["bad email", { email: "not-an-email" }, "email"],
      ["missing email", { email: undefined }, "email"],
      ["short phone", { phone: "12345" }, "phone"],
      ["phone starting with 5", { phone: "5876543210" }, "phone"],
      ["bad alternate phone", { phoneAlt: "12345" }, "phoneAlt"],
      ["missing address", { address: undefined }, "address"],
      ["empty address line", { address: { line: "", city: "Mysuru", pincode: "570001" } }, "address.line"],
      ["city with digits", { address: { line: "x", city: "My5uru", pincode: "570001" } }, "address.city"],
      ["short pincode", { address: { line: "x", city: "Mysuru", pincode: "5700" } }, "address.pincode"],
      ["pincode starting with 0", { address: { line: "x", city: "Mysuru", pincode: "070001" } }, "address.pincode"],
      ["wrong GSTIN check character", { gstin: "27AAPFU0939F1ZX" }, "gstin"],
      ["short GSTIN", { gstin: "27AAPFU0939F1Z" }, "gstin"],
      ["unknown state code in GSTIN", { gstin: "25AAPFU0939F1ZV" }, "gstin"],
      ["missing GSTIN", { gstin: undefined }, "gstin"],
    ];

    it.each(cases)("%s", async (_label, over, field) => {
      const res = await post(body(over)).expect(400);
      expect(res.body.code).toBe("VALIDATION_FAILED");
      expect(errorsOf(res).some((m) => m.startsWith(`${field} `))).toBe(true);
      expect(await customers.countDocuments()).toBe(0);
    });

    it("explains an invalid GSTIN in plain words", async () => {
      const res = await post(body({ gstin: "27AAPFU0939F1ZX" })).expect(400);
      expect(errorsOf(res)).toContain("gstin must be a valid GSTIN: check the number");
    });

    it("reports every bad field at once", async () => {
      const res = await post(body({ name: "A", phone: "1", gstin: "nope" })).expect(400);
      const fields = errorsOf(res).map((m) => m.split(" ")[0]);
      expect(fields).toEqual(expect.arrayContaining(["name", "phone", "gstin"]));
    });

    it("rejects fields the client must not send, including stateCode, isDeleted and createdBy", async () => {
      for (const extra of [{ stateCode: "29" }, { isDeleted: true }, { createdBy: "x" }, { id: "x" }, { nameLower: "x" }]) {
        const res = await post(body(extra)).expect(400);
        expect(res.body.code).toBe("VALIDATION_FAILED");
      }
      expect(await customers.countDocuments()).toBe(0);
    });

    it("rejects a body that is not an object", async () => {
      await post([]).expect(400);
      await post("text").expect(400);
    });
  });

  describe("duplicate GSTIN", () => {
    it("answers 409 GSTIN_EXISTS for a second active customer", async () => {
      await post(body()).expect(201);
      const res = await post(body({ name: "Another Name" })).expect(409);
      expect(res.body.code).toBe(GSTIN_EXISTS);
      expect(errorsOf(res)).toEqual(["gstin is already used by another customer"]);
      expect(await customers.countDocuments()).toBe(1);
    });

    it("also catches it when the GSTIN is typed in lower case with spaces", async () => {
      await post(body()).expect(201);
      await post(body({ gstin: " 27aapfu0939f1zv " })).expect(409);
    });

    it("allows the GSTIN again once the first customer is soft-deleted", async () => {
      const first = await post(body()).expect(201);
      await customers.updateOne({ _id: first.body.data.id }, { isDeleted: true, deletedAt: new Date() });
      await post(body({ name: "Fresh Customer" })).expect(201);
    });

    it("lets exactly one of several parallel creates win", async () => {
      const results = await Promise.all(Array.from({ length: 6 }, (_v, i) => post(body({ name: `Parallel ${i} Co` }))));
      const statuses = results.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(5);
      expect(await customers.countDocuments()).toBe(1);
    });
  });

  describe("access", () => {
    it("needs a signed-in user", async () => {
      await post(body(), null).expect(401);
      await post(body(), "not-a-token").expect(401);
      expect(await customers.countDocuments()).toBe(0);
    });
  });
});
