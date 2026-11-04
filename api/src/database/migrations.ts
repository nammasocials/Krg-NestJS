import { Logger } from "@nestjs/common";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";

export const MIGRATIONS_DIR = "migrations";

/** Applies pending migrations (mock mode at startup; real mode uses `pnpm db:migrate`). */
export async function runMigrations(uri: string, databaseName: string): Promise<string[]> {
  // Under CommonJS, `require("migrate-mongo")` is a proxy whose properties are promises; awaiting works for both shapes.
  const mod = await import("migrate-mongo");
  const [config, database, up] = await Promise.all([mod.config, mod.database, mod.up]);
  const dir = resolve(process.cwd(), MIGRATIONS_DIR);
  await mkdir(dir, { recursive: true });

  config.set({
    mongodb: { url: uri, databaseName },
    migrationsDir: dir,
    changelogCollectionName: "migrations",
    lockCollectionName: "migrations_lock",
    lockTtl: 0,
    migrationFileExtension: ".mjs",
    useFileHash: false,
    moduleSystem: "esm",
  });

  const { db, client } = await database.connect();
  try {
    const applied: string[] = await up(db, client);
    new Logger("Migrations").log(applied.length ? `Applied: ${applied.join(", ")}` : "No pending migrations");
    return applied;
  } finally {
    await client.close();
  }
}
