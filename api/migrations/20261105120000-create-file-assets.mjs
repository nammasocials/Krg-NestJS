// E03-T027: metadata of uploaded files. Safe to run twice (index specs are identical).

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "fileAssets");
  const assets = db.collection("fileAssets");
  // For the clean-up job: find PENDING/ORPHANED files by age.
  await assets.createIndex({ status: 1, createdAt: 1 }, { name: "status_createdAt" });
  // To ask "does any attached asset still use this file on disk?".
  await assets.createIndex({ storageKey: 1 }, { name: "storageKey" });
}

export async function down(db) {
  // Drops the metadata (the files on disk stay). Only meant for development rollbacks.
  await db
    .collection("fileAssets")
    .drop()
    .catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
}
