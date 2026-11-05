import { createHash, randomUUID } from "node:crypto";
import { createReadStream, type ReadStream } from "node:fs";
import { mkdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Env } from "../config/env.schema";

export type StoredFile = { storageKey: string; sha256: string; size: number };

const ENTITY = /^[a-z][a-z0-9-]{1,30}$/;
const EXT = /^(jpg|png|webp)$/;
/** The only shape of key this service produces and accepts: `customers/ab/<64 hex>.png`. */
const KEY = /^[a-z][a-z0-9-]{1,30}\/[0-9a-f]{2}\/[0-9a-f]{64}\.(jpg|png|webp)$/;

/**
 * Files on local disk under UPLOAD_DIR. Keys are built here from the content hash, never from a
 * client-supplied name, and every path is checked to stay inside the upload directory. Callers deal
 * in keys, so moving to S3-compatible storage later does not change them.
 */
@Injectable()
export class StorageService {
  readonly root: string;

  constructor(config: ConfigService<Env, true>) {
    this.root = path.resolve(config.get("UPLOAD_DIR", { infer: true }));
  }

  /** Saves the bytes (once per distinct content) and returns the key. Same bytes, same key. */
  async save(entity: string, data: Buffer, ext: string): Promise<StoredFile> {
    if (!ENTITY.test(entity) || !EXT.test(ext)) throw new Error("Invalid storage location");
    const sha256 = createHash("sha256").update(data).digest("hex");
    const storageKey = `${entity}/${sha256.slice(0, 2)}/${sha256}.${ext}`;
    const full = this.resolve(storageKey);

    if (!(await this.exists(storageKey))) {
      await mkdir(path.dirname(full), { recursive: true });
      // Write beside the target, then rename: a reader never sees half a file.
      const tmp = `${full}.${randomUUID()}.tmp`;
      try {
        await writeFile(tmp, data, { flag: "wx" });
        await rename(tmp, full);
      } catch (err) {
        await rm(tmp, { force: true });
        throw err;
      }
    }
    return { storageKey, sha256, size: data.length };
  }

  read(storageKey: string): ReadStream {
    return createReadStream(this.resolve(storageKey));
  }

  async exists(storageKey: string): Promise<boolean> {
    try {
      return (await stat(this.resolve(storageKey))).isFile();
    } catch {
      return false;
    }
  }

  async delete(storageKey: string): Promise<void> {
    await rm(this.resolve(storageKey), { force: true });
  }

  /** Absolute path for a key; throws for anything that is not a key this service made. */
  resolve(storageKey: string): string {
    if (typeof storageKey !== "string" || !KEY.test(storageKey)) throw new Error("Invalid storage key");
    const full = path.resolve(this.root, storageKey);
    if (!full.startsWith(this.root + path.sep)) throw new Error("Invalid storage key");
    return full;
  }
}
