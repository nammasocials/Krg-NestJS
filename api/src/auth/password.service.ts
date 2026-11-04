import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as argon2 from "argon2";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Env } from "../config/env.schema";

export const LEGACY_PREFIX = "sha512$";

export interface VerifyResult {
  valid: boolean;
  /** True when the stored hash should be replaced with a fresh argon2id hash (legacy or outdated cost). */
  needsRehash: boolean;
}

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private get options(): argon2.HashOptions {
    return {
      type: argon2.argon2id,
      memoryCost: this.config.get("ARGON2_MEMORY_KIB", { infer: true }),
      timeCost: this.config.get("ARGON2_TIME_COST", { infer: true }),
      parallelism: this.config.get("ARGON2_PARALLELISM", { infer: true }),
    };
  }

  /** argon2id with a unique random salt; the result is self-describing (`$argon2id$...`). */
  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(plain: string, stored: string): Promise<VerifyResult> {
    if (stored.startsWith(LEGACY_PREFIX)) {
      return { valid: this.verifyLegacy(plain, stored.slice(LEGACY_PREFIX.length)), needsRehash: true };
    }
    let valid = false;
    try {
      valid = await argon2.verify(stored, plain);
    } catch {
      // malformed stored value: treat as a failed login, never as a crash
    }
    return { valid, needsRehash: valid && argon2.needsRehash(stored, this.options) };
  }

  /** Old system: lowercase hex of SHA-512 over the UTF-8 password, no salt. Compared in constant time. */
  private verifyLegacy(plain: string, storedHex: string): boolean {
    const expected = Buffer.from(storedHex.toLowerCase(), "hex");
    const actual = createHash("sha512").update(plain, "utf8").digest();
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  }

  /** Legacy-format value, only used by the data migration and tests. */
  static legacyHash(plain: string): string {
    return LEGACY_PREFIX + createHash("sha512").update(plain, "utf8").digest("hex");
  }
}
