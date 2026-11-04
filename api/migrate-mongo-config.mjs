// CLI config for `pnpm db:migrate` (real MongoDB). In mock mode the app runs migrations itself at startup.
const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("MONGODB_URI is required to run migrations from the CLI (DB_MODE=real).");

const match = /^mongodb(?:\+srv)?:\/\/[^/]*\/([^?]+)/.exec(uri);

export default {
  mongodb: { url: uri, databaseName: match ? decodeURIComponent(match[1]) : "krg" },
  migrationsDir: "migrations",
  changelogCollectionName: "migrations",
  lockCollectionName: "migrations_lock",
  lockTtl: 0,
  migrationFileExtension: ".mjs",
  useFileHash: false,
  moduleSystem: "esm",
};
