import { validateEnv } from "./env.schema";

const base = { JWT_ACCESS_SECRET: "x".repeat(32) };

describe("validateEnv", () => {
  it("applies defaults", () => {
    const env = validateEnv(base);
    expect(env.PORT).toBe(5000);
    expect(env.DB_MODE).toBe("mock");
    expect(env.JWT_ACCESS_TTL).toBe("15m");
    expect(env.CORS_ORIGIN).toBe("http://localhost:4000");
  });

  it("names the missing secret", () => {
    expect(() => validateEnv({})).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects a short secret", () => {
    expect(() => validateEnv({ JWT_ACCESS_SECRET: "short" })).toThrow(/at least 32/);
  });

  it("rejects a bad port", () => {
    expect(() => validateEnv({ ...base, PORT: "abc" })).toThrow(/PORT/);
  });

  it("requires MONGODB_URI in real mode", () => {
    expect(() => validateEnv({ ...base, DB_MODE: "real", MONGODB_URI: "" })).toThrow(/MONGODB_URI/);
    expect(validateEnv({ ...base, DB_MODE: "real", MONGODB_URI: "mongodb://h/db" }).DB_MODE).toBe("real");
  });

  it("refuses mock mode in production", () => {
    expect(() => validateEnv({ ...base, NODE_ENV: "production", DB_MODE: "mock" })).toThrow(/DB_MODE.*production/);
    expect(() => validateEnv({ ...base, NODE_ENV: "production" })).toThrow(/DB_MODE/);
    expect(
      validateEnv({ ...base, NODE_ENV: "production", DB_MODE: "real", MONGODB_URI: "mongodb://h/db" }).DB_MODE,
    ).toBe("real");
  });

  it("rejects a bad TTL", () => {
    expect(() => validateEnv({ ...base, JWT_ACCESS_TTL: "soon" })).toThrow(/JWT_ACCESS_TTL/);
  });
});
