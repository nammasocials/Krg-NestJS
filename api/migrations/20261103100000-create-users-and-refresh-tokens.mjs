// E02-T009: collections and indexes for sign-in. Safe to run twice (index specs are identical).

const COLLATION_CI = { locale: "en", strength: 2 };

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "users");
  await db
    .collection("users")
    .createIndex({ username: 1 }, { name: "username_unique_ci", unique: true, collation: COLLATION_CI });

  await ensureCollection(db, "refreshTokens");
  const tokens = db.collection("refreshTokens");
  await tokens.createIndex({ tokenHash: 1 }, { name: "tokenHash_unique", unique: true });
  await tokens.createIndex({ expiresAt: 1 }, { name: "expiresAt_ttl", expireAfterSeconds: 0 });
  await tokens.createIndex({ userId: 1 }, { name: "userId" });
  await tokens.createIndex({ familyId: 1 }, { name: "familyId" });
}

export async function down(db) {
  // Drops the collections, and with them the data. Only meant for development rollbacks.
  await db.collection("refreshTokens").drop().catch(ignoreMissing);
  await db.collection("users").drop().catch(ignoreMissing);
}

function ignoreMissing(err) {
  if (err.codeName !== "NamespaceNotFound") throw err;
}
