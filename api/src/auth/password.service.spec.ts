import { ConfigService } from "@nestjs/config";
import { PasswordService } from "./password.service";

function service(over: Record<string, number> = {}) {
  const values: Record<string, number> = { ARGON2_MEMORY_KIB: 1024, ARGON2_TIME_COST: 1, ARGON2_PARALLELISM: 1, ...over };
  return new PasswordService({ get: (k: string) => values[k] } as unknown as ConfigService<never, true>);
}

describe("PasswordService", () => {
  const svc = service();

  it("hashes with argon2id and a unique salt", async () => {
    const a = await svc.hash("Secret#123");
    const b = await svc.hash("Secret#123");
    expect(a).toMatch(/^\$argon2id\$/);
    expect(a).not.toBe(b);
    expect(a).not.toContain("Secret#123");
  });

  it("accepts the right password and rejects a wrong one", async () => {
    const h = await svc.hash("Secret#123");
    expect(await svc.verify("Secret#123", h)).toEqual({ valid: true, needsRehash: false });
    expect(await svc.verify("secret#123", h)).toEqual({ valid: false, needsRehash: false });
  });

  it("signals a rehash when the cost parameters have been raised", async () => {
    const h = await svc.hash("Secret#123");
    const stronger = service({ ARGON2_MEMORY_KIB: 2048 });
    expect(await stronger.verify("Secret#123", h)).toEqual({ valid: true, needsRehash: true });
  });

  it("accepts a legacy SHA-512 hash once and asks for an upgrade", async () => {
    const legacy = PasswordService.legacyHash("Secret#123");
    expect(legacy).toMatch(/^sha512\$[0-9a-f]{128}$/);
    expect(await svc.verify("Secret#123", legacy)).toEqual({ valid: true, needsRehash: true });
  });

  it("matches the old system's value for a known password", async () => {
    // SHA-512("password") — what the old HashHelper stored, lowercase hex.
    const known =
      "sha512$b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb980b1d7785e5976ec049b46df5f1326af5a2ea6d103fd07c95385ffab0cacbc86";
    expect((await svc.verify("password", known)).valid).toBe(true);
    expect((await svc.verify("password", known.toUpperCase().replace("SHA512$", "sha512$"))).valid).toBe(true);
  });

  it("rejects a wrong password against a legacy hash", async () => {
    const legacy = PasswordService.legacyHash("Secret#123");
    expect((await svc.verify("wrong", legacy)).valid).toBe(false);
  });

  it("treats malformed stored values as a failed login", async () => {
    expect((await svc.verify("x", "not-a-hash")).valid).toBe(false);
    expect((await svc.verify("x", "sha512$zz")).valid).toBe(false);
    expect((await svc.verify("x", "")).valid).toBe(false);
  });
});
