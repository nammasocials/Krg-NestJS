import { INestApplication } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import { type Connection, type Model } from "mongoose";
import { validateEnv } from "../config/env.schema";
import { DatabaseModule } from "../database/database.module";
import { Customer } from "./customer.schema";
import { CustomersModule } from "./customers.module";

const valid = {
  name: "  Sri Lakshmi Traders  ",
  email: "Accounts@Example.COM",
  phone: "9876543210",
  address: { line: "12 Market Road", city: "Mysuru", pincode: "570001" },
  gstin: "27aapfu0939f1zv",
};

// Always the in-memory mock database; the startup runs the real migrations.
describe("customers collection (mock database)", () => {
  let app: INestApplication;
  let connection: Connection;
  let model: Model<Customer>;

  beforeAll(async () => {
    const env = validateEnv({ NODE_ENV: "test", DB_MODE: "mock", MOCK_DB_PATH: "", JWT_ACCESS_SECRET: "x".repeat(32) });
    const moduleRef = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }), DatabaseModule, CustomersModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    connection = app.get<Connection>(getConnectionToken());
    model = app.get<Model<Customer>>(getModelToken(Customer.name));
    await model.init();
  }, 300_000);

  afterAll(async () => {
    await app.close();
  }, 60_000);

  afterEach(async () => {
    await model.deleteMany({});
  });

  it("the migration created the indexes", async () => {
    const indexes = await connection.collection("customers").indexes();
    const byName = Object.fromEntries(indexes.map((i) => [i.name!, i]));
    expect(byName.gstin_unique_active).toMatchObject({
      key: { gstin: 1 },
      unique: true,
      partialFilterExpression: { isDeleted: false, gstin: { $type: "string" } },
    });
    expect(byName.nameLower_id.key).toEqual({ nameLower: 1, _id: 1 });
    expect(byName.createdAt_id_desc.key).toEqual({ createdAt: -1, _id: -1 });
    expect(byName.isDeleted.key).toEqual({ isDeleted: 1 });
  });

  it("derives nameLower and stateCode and normalises text fields", async () => {
    const c = await model.create(valid);
    expect(c.name).toBe("Sri Lakshmi Traders");
    expect(c.nameLower).toBe("sri lakshmi traders");
    expect(c.gstin).toBe("27AAPFU0939F1ZV");
    expect(c.stateCode).toBe("27");
    expect(c.email).toBe("accounts@example.com");
    expect(c.isDeleted).toBe(false);
    expect((c as unknown as { createdAt: Date }).createdAt).toBeInstanceOf(Date);
  });

  it("keeps the derived fields in step when name or GSTIN change", async () => {
    const c = await model.create(valid);
    c.name = "New Name";
    c.gstin = "29AABCT1332L1ZU";
    await c.save();
    const fresh = await model.findById(c._id);
    expect(fresh?.nameLower).toBe("new name");
    expect(fresh?.stateCode).toBe("29");
  });

  it("toJSON gives id and hides _id and nameLower", async () => {
    const json = (await model.create(valid)).toJSON() as unknown as Record<string, unknown>;
    expect(typeof json.id).toBe("string");
    expect(json).not.toHaveProperty("_id");
    expect(json).not.toHaveProperty("nameLower");
    expect(json).not.toHaveProperty("__v");
    expect(json.address).toEqual({ line: "12 Market Road", city: "Mysuru", pincode: "570001" });
  });

  it("rejects missing or malformed fields", async () => {
    const bad: Array<Record<string, unknown>> = [
      { ...valid, name: "A" },
      { ...valid, name: "x".repeat(101) },
      { ...valid, phone: "12345" },
      { ...valid, phoneAlt: "12345" },
      { ...valid, gstin: "NOTAGSTIN" },
      { ...valid, address: { line: "x", city: "y", pincode: "12" } },
      { ...valid, address: undefined },
      { ...valid, email: undefined },
    ];
    for (const doc of bad) await expect(model.create(doc)).rejects.toThrow();
  });

  it("allows one active customer per GSTIN, and the GSTIN again after a soft delete", async () => {
    const first = await model.create(valid);
    await expect(model.create({ ...valid, name: "Other Name" })).rejects.toMatchObject({ code: 11000 });

    first.isDeleted = true;
    first.deletedAt = new Date();
    await first.save();

    await expect(model.create({ ...valid, name: "Reuses The GSTIN" })).resolves.toBeDefined();
    // Two deleted customers may share a GSTIN as well.
    const another = await model.findOne({ name: "Reuses The GSTIN" });
    another!.isDeleted = true;
    await another!.save();
    await expect(model.create({ ...valid, name: "Third One" })).resolves.toBeDefined();
  });

  it("is safe to run the migration twice and can roll it back", async () => {
    const file = "../../migrations/20261105100000-create-customers.mjs"; // a variable: the .mjs file has no types
    const { up, down } = (await import(file)) as {
      up: (db: unknown) => Promise<void>;
      down: (db: unknown) => Promise<void>;
    };
    const db = connection.db!;
    await up(db);
    await up(db);
    await down(db);
    expect((await db.listCollections({ name: "customers" }).toArray()).length).toBe(0);
    await down(db); // already gone: no error
    await up(db); // leave it as the other tests expect
    expect((await db.collection("customers").indexes()).map((i) => i.name)).toContain("gstin_unique_active");
  });
});
