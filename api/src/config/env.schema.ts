import { z } from "zod";
import { USERNAME_PATTERN } from "../users/roles";

const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);

export const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(5000),
    CORS_ORIGIN: z.string().min(1).default("http://localhost:4000"),
    DB_MODE: z.enum(["mock", "real"]).default("mock"),
    MONGODB_URI: z.preprocess(emptyToUndefined, z.string().optional()),
    MOCK_DB_PATH: z.string().default(".data/mongo"),
    MOCK_DB_PORT: z.coerce.number().int().min(1024).max(65535).default(27018),
    MOCK_DB_VERSION: z.preprocess(emptyToUndefined, z.string().optional()),
    JWT_ACCESS_SECRET: z.string().min(32, "must be at least 32 characters"),
    JWT_ACCESS_TTL: z.string().regex(/^\d+[smhd]$/, "must look like 15m, 1h or 30s").default("15m"),
    REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    // Login rate limiting (in memory, single instance). Both windows are in seconds.
    LOGIN_IP_LIMIT: z.coerce.number().int().min(1).default(20),
    LOGIN_IP_WINDOW_SECONDS: z.coerce.number().int().min(1).default(60),
    LOGIN_FAIL_LIMIT: z.coerce.number().int().min(1).default(5),
    LOGIN_FAIL_WINDOW_SECONDS: z.coerce.number().int().min(1).default(900),
    // Express "trust proxy": false, true, a hop count (1), or a subnet name/list (loopback, 10.0.0.0/8).
    TRUST_PROXY: z.string().default("false"),
    // argon2id cost (OWASP minimum profile: 19 MiB, 2 passes, 1 lane). Tests use cheap values.
    ARGON2_MEMORY_KIB: z.coerce.number().int().min(8).default(19456),
    ARGON2_TIME_COST: z.coerce.number().int().min(1).default(2),
    ARGON2_PARALLELISM: z.coerce.number().int().min(1).max(16).default(1),
    // First admin (see seed). The password is optional: if unset, a random one is printed once.
    SEED_ADMIN_USERNAME: z.string().regex(USERNAME_PATTERN, "must be 5-20 letters/digits, starting with a letter").default("admin"),
    SEED_ADMIN_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(8, "must be at least 8 characters").optional()),
    SEED_ADMIN_FULL_NAME: z.string().min(1).default("Administrator"),
  })
  .refine((env) => env.DB_MODE !== "real" || !!env.MONGODB_URI, {
    path: ["MONGODB_URI"],
    message: "is required when DB_MODE=real",
  })
  .refine((env) => !(env.NODE_ENV === "production" && env.DB_MODE === "mock"), {
    path: ["DB_MODE"],
    message: "mock is not allowed when NODE_ENV=production",
  });

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: returns the parsed env or throws naming every bad variable. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "(env)"}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }
  return result.data;
}
