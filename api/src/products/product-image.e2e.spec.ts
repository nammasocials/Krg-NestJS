import { mkdtempSync } from "node:fs";
import { readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

// Set before AppModule is imported: ConfigModule reads process.env when the module is created.
const UPLOAD_DIR = mkdtempSync(path.join(tmpdir(), "krg-product-img-"));
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
process.env.UPLOAD_DIR = UPLOAD_DIR;
process.env.MAX_UPLOAD_MB = "0.01"; // 10 485 bytes, keeps the oversize test small

import { INestApplication } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test } from "@nestjs/testing";
import type { Model } from "mongoose";
import request from "supertest";
import { AppModule } from "../app.module";
import { configureApp } from "../app.setup";
import { AuditLog } from "../audit/audit-log.schema";
import { AuditService } from "../audit/audit.service";
import { FileAsset } from "../files/file-asset.schema";
import { Product } from "./product.schema";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("png body 1")]);
const png2 = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from("png body 2")]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.from("jpeg body")]);
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([9, 0, 0, 0]), Buffer.from("WEBPVP8 body")]);
const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

const body = { name: "Basmati Rice 25kg", unit: "PACK", unitPrice: 125050, hsnCode: "10063020", gstRate: 5 };
const MISSING = "64b7f0f0f0f0f0f0f0f0f0f0";

describe("product image (mock database, temporary upload folder)", () => {
  let app: INestApplication;
  let products: Model<Product>;
  let assets: Model<FileAsset>;
  let logs: Model<AuditLog>;
  let token: string;
  let id: string;

  const auth = (r: request.Test, t: string | null = token) => (t ? r.set("Authorization", `Bearer ${t}`) : r);
  const url = (productId = id) => `/api/v1/products/${productId}/image`;
  const upload = (buf: Buffer | string, filename = "p.png", contentType = "image/png", productId = id, t: string | null = token) =>
    auth(request(app.getHttpServer()).put(url(productId)).attach("file", Buffer.from(buf), { filename, contentType }), t);
  const filesOnDisk = async () => {
    const out: string[] = [];
    const walk = async (d: string) => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        if (e.isDirectory()) await walk(path.join(d, e.name));
        else out.push(path.relative(UPLOAD_DIR, path.join(d, e.name)).replaceAll("\\", "/"));
      }
    };
    await walk(UPLOAD_DIR);
    return out.sort();
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    products = app.get<Model<Product>>(getModelToken(Product.name));
    assets = app.get<Model<FileAsset>>(getModelToken(FileAsset.name));
    logs = app.get<Model<AuditLog>>(getModelToken(AuditLog.name));
    await products.init();
    const res = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ username: "admin", password: "AdminPass#1" })
      .expect(200);
    token = res.body.data.accessToken;
  }, 300_000);

  afterAll(async () => {
    await app.close();
    await rm(UPLOAD_DIR, { recursive: true, force: true });
  }, 60_000);

  beforeEach(async () => {
    const res = await auth(request(app.getHttpServer()).post("/api/v1/products")).send(body).expect(201);
    id = res.body.data.id;
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await products.deleteMany({});
    await assets.deleteMany({});
    await logs.deleteMany({});
    await rm(UPLOAD_DIR, { recursive: true, force: true });
  });

  describe("upload", () => {
    it.each([
      ["JPEG", jpeg, "image/jpeg", "jpg"],
      ["PNG", png, "image/png", "png"],
      ["WebP", webp, "image/webp", "webp"],
    ])("accepts a %s and stores it by content hash under products/", async (_n, buf, mime, ext) => {
      const res = await upload(buf, "whatever", "application/octet-stream").expect(200);
      expect(res.body.data.image).toMatchObject({ mime, size: buf.length });
      const key = `products/${sha(buf).slice(0, 2)}/${sha(buf)}.${ext}`;
      expect(await filesOnDisk()).toEqual([key]);
      expect(await readFile(path.join(UPLOAD_DIR, key))).toEqual(buf);
      const asset = await assets.findOne({}).lean();
      expect(asset).toMatchObject({ storageKey: key, mime, size: buf.length, sha256: sha(buf), status: "ATTACHED" });
      expect(asset?._id.toString()).toBe(res.body.data.image.fileId);
    });

    it("decides by content: a text file called .png is 415 and nothing is stored", async () => {
      const res = await upload("this is just text").expect(415);
      expect(res.body.code).toBe("UNSUPPORTED_MEDIA_TYPE");
      expect(await assets.countDocuments()).toBe(0);
      await expect(filesOnDisk()).rejects.toThrow();
    });

    it("rejects SVG, GIF and HTML even with an image content type", async () => {
      for (const content of ['<svg xmlns="http://www.w3.org/2000/svg"></svg>', "GIF89a....", "<html></html>"]) {
        await upload(content).expect(415);
      }
    });

    it("accepts a real PNG whose name and content type lie", async () => {
      await upload(png, "p.txt", "text/plain").expect(200);
    });

    it("413 when larger than MAX_UPLOAD_MB, storing nothing and keeping the old image", async () => {
      await upload(png).expect(200);
      const big = Buffer.concat([png2, Buffer.alloc(11_000, 1)]);
      const res = await upload(big).expect(413);
      expect(res.body.code).toBe("PAYLOAD_TOO_LARGE");
      expect(await assets.countDocuments()).toBe(1);
      expect((await products.findById(id).lean())?.image?.size).toBe(png.length);
    });

    it("400 for an empty file, a missing file and a wrong field name", async () => {
      await upload(Buffer.alloc(0)).expect(400);
      await auth(request(app.getHttpServer()).put(url())).send({}).expect(400);
      await auth(request(app.getHttpServer()).put(url()).attach("other", png, "p.png")).expect(400);
    });

    it("never uses the uploaded file name for the path", async () => {
      for (const name of ["../../evil.png", "..\\..\\evil.png", "/etc/passwd", "a/b/c.png"]) {
        await upload(png, name).expect(200);
      }
      expect(await filesOnDisk()).toEqual([`products/${sha(png).slice(0, 2)}/${sha(png)}.png`]);
    });

    it("404 for unknown, malformed or deleted products, storing nothing", async () => {
      await upload(png, "p.png", "image/png", MISSING).expect(404);
      await upload(png, "p.png", "image/png", "abc").expect(404);
      await auth(request(app.getHttpServer()).delete(`/api/v1/products/${id}`)).expect(204);
      await upload(png).expect(404);
      expect(await assets.countDocuments()).toBe(0);
    });

    it("401 without sign-in", async () => {
      await upload(png, "p.png", "image/png", id, null).expect(401);
    });
  });

  describe("replace", () => {
    it("attaches the new file, orphans the old one, keeps both on disk, and audits ids and sizes only", async () => {
      const first = await upload(png).expect(200);
      const second = await upload(jpeg, "b.jpg", "image/jpeg").expect(200);
      expect(second.body.data.image.fileId).not.toBe(first.body.data.image.fileId);

      const byId = async (fid: string) => (await assets.findById(fid).lean())?.status;
      expect(await byId(first.body.data.image.fileId)).toBe("ORPHANED");
      expect(await byId(second.body.data.image.fileId)).toBe("ATTACHED");
      expect(await filesOnDisk()).toHaveLength(2);

      const updates = await logs.find({ action: "UPDATE", entityId: id }).sort({ _id: 1 }).lean();
      expect(updates).toHaveLength(2);
      expect(updates[0].before?.image).toBeUndefined();
      expect(updates[1].changedFields).toEqual(expect.arrayContaining(["image.fileId", "image.mime", "image.size"]));
      expect(JSON.stringify(updates)).not.toContain("PNG");
    });

    it("uploading the same image again keeps one file on disk", async () => {
      await upload(png).expect(200);
      await upload(png).expect(200);
      expect(await filesOnDisk()).toHaveLength(1);
      expect(await assets.countDocuments({ status: "ATTACHED" })).toBe(1);
      expect(await assets.countDocuments({ status: "ORPHANED" })).toBe(1);
    });

    it("leaves the asset PENDING and the product unchanged if the database step fails", async () => {
      await upload(png).expect(200);
      jest.spyOn(app.get(AuditService), "record").mockRejectedValueOnce(new Error("audit down"));
      await upload(png2).expect(500);
      jest.restoreAllMocks();
      expect((await products.findById(id).lean())?.image?.size).toBe(png.length);
      expect(await assets.countDocuments({ status: "PENDING" })).toBe(1);
      expect(await assets.countDocuments({ status: "ATTACHED" })).toBe(1);
    });
  });

  describe("download", () => {
    it("streams the exact bytes with the stored type and private cache headers", async () => {
      await upload(jpeg, "x.png", "image/png").expect(200);
      const res = await auth(request(app.getHttpServer()).get(url()))
        .buffer(true)
        .parse((r, cb) => {
          const parts: Buffer[] = [];
          r.on("data", (c: Buffer) => parts.push(c));
          r.on("end", () => cb(null, Buffer.concat(parts)));
        })
        .expect(200);
      expect(res.body).toEqual(jpeg);
      expect(res.headers["content-type"]).toBe("image/jpeg");
      expect(res.headers["cache-control"]).toBe("private, no-cache");
      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["content-length"]).toBe(String(jpeg.length));
      expect(res.headers.etag).toBe(`"${sha(jpeg)}"`);
    });

    it("answers 304 when the ETag still matches", async () => {
      await upload(png).expect(200);
      await auth(request(app.getHttpServer()).get(url()).set("If-None-Match", `"${sha(png)}"`)).expect(304);
      await auth(request(app.getHttpServer()).get(url()).set("If-None-Match", '"other"')).expect(200);
    });

    it("404 when there is no image, for unknown or deleted products, and when the file vanished", async () => {
      await auth(request(app.getHttpServer()).get(url())).expect(404);
      await auth(request(app.getHttpServer()).get(url(MISSING))).expect(404);
      await upload(png).expect(200);
      await rm(UPLOAD_DIR, { recursive: true, force: true });
      await auth(request(app.getHttpServer()).get(url())).expect(404);
    });

    it("404 for a deleted product that had an image", async () => {
      await upload(png).expect(200);
      await auth(request(app.getHttpServer()).delete(`/api/v1/products/${id}`)).expect(204);
      await auth(request(app.getHttpServer()).get(url())).expect(404);
    });

    it("401 without sign-in, and the upload folder is not served statically", async () => {
      await upload(png).expect(200);
      await request(app.getHttpServer()).get(url()).expect(401);
      const key = `products/${sha(png).slice(0, 2)}/${sha(png)}.png`;
      for (const p of [`/${key}`, `/uploads/${key}`, `/api/v1/uploads/${key}`, `/api/v1/files/${key}`]) {
        expect((await auth(request(app.getHttpServer()).get(p))).status).toBe(404);
      }
    });
  });

  describe("delete", () => {
    it("detaches the image (204), orphans the asset, audits, and the second delete is 404", async () => {
      const up = await upload(png).expect(200);
      await auth(request(app.getHttpServer()).delete(url())).expect(204);
      expect((await products.findById(id).lean())?.image).toBeUndefined();
      expect((await assets.findById(up.body.data.image.fileId).lean())?.status).toBe("ORPHANED");
      await auth(request(app.getHttpServer()).get(url())).expect(404);
      await auth(request(app.getHttpServer()).delete(url())).expect(404);
      const updates = await logs.find({ action: "UPDATE", entityId: id }).sort({ _id: 1 }).lean();
      expect(updates[1].changedFields).toEqual(expect.arrayContaining(["image.fileId"]));
      expect(updates[1].after?.image).toBeUndefined();
    });

    it("404 for a product without an image or a deleted one, and 401 without sign-in", async () => {
      await auth(request(app.getHttpServer()).delete(url())).expect(404);
      await auth(request(app.getHttpServer()).delete(url(MISSING))).expect(404);
      await request(app.getHttpServer()).delete(url()).expect(401);
    });
  });

  it("the product list shows hasImage, and GET /products/:id shows the image info", async () => {
    await upload(png).expect(200);
    const list = await auth(request(app.getHttpServer()).get("/api/v1/products")).expect(200);
    expect(list.body.data.items[0].hasImage).toBe(true);
    const one = await auth(request(app.getHttpServer()).get(`/api/v1/products/${id}`)).expect(200);
    expect(one.body.data.image).toMatchObject({ mime: "image/png", size: png.length });
  });
});
