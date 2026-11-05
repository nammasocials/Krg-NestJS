import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.schema";
import { StorageService } from "./storage.service";

describe("StorageService", () => {
  let dir: string;
  let storage: StorageService;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), "krg-storage-"));
    storage = new StorageService({ get: () => dir } as unknown as ConfigService<Env, true>);
  });
  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  const bytes = Buffer.from("not really a png, storage does not care");
  const sha = createHash("sha256").update(bytes).digest("hex");

  it("saves under <entity>/<2-char prefix>/<sha256>.<ext>", async () => {
    const stored = await storage.save("customers", bytes, "png");
    expect(stored).toEqual({ storageKey: `customers/${sha.slice(0, 2)}/${sha}.png`, sha256: sha, size: bytes.length });
    expect(await readFile(path.join(dir, stored.storageKey))).toEqual(bytes);
  });

  it("stores identical content once and leaves no temporary files", async () => {
    const a = await storage.save("customers", bytes, "png");
    const b = await storage.save("customers", bytes, "png");
    expect(b.storageKey).toBe(a.storageKey);
    expect(await readdir(path.dirname(path.join(dir, a.storageKey)))).toEqual([`${sha}.png`]);
  });

  it("reads back as a stream, reports existence and deletes", async () => {
    const { storageKey } = await storage.save("customers", bytes, "webp");
    const chunks: Buffer[] = [];
    for await (const c of storage.read(storageKey)) chunks.push(c as Buffer);
    expect(Buffer.concat(chunks)).toEqual(bytes);
    expect(await storage.exists(storageKey)).toBe(true);
    await storage.delete(storageKey);
    expect(await storage.exists(storageKey)).toBe(false);
    await storage.delete(storageKey); // deleting twice is fine
  });

  it.each([
    "../secret.png",
    "customers/../../secret.png",
    "/etc/passwd",
    "C:\\Windows\\win.ini",
    "customers/ab/../../x.png",
    `customers/${sha.slice(0, 2)}/${sha}.png/../../../x`,
    `customers/${sha.slice(0, 2)}/${sha}.exe`,
    `customers/zz/${sha}.png`,
    `customers/${sha.slice(0, 2)}/${sha.toUpperCase()}.png`,
    "customers/ab/short.png",
    "",
  ])("refuses the key %j", (key) => {
    expect(() => storage.resolve(key)).toThrow("Invalid storage key");
    expect(() => storage.read(key)).toThrow();
  });

  it("refuses bad folder names and extensions when saving", async () => {
    for (const entity of ["../x", "a/b", "Customers", "", "a".repeat(40)]) {
      await expect(storage.save(entity, bytes, "png")).rejects.toThrow("Invalid storage location");
    }
    for (const ext of ["exe", "png/../x", "", "PNG", "svg"]) {
      await expect(storage.save("customers", bytes, ext)).rejects.toThrow("Invalid storage location");
    }
    await expect(stat(path.join(dir, "x"))).rejects.toThrow();
  });
});
