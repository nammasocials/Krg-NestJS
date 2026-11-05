// E03-T026: the append-only audit trail. Safe to run twice (index specs are identical).

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "auditLogs");
  const logs = db.collection("auditLogs");
  await logs.createIndex({ entity: 1, entityId: 1, createdAt: -1 }, { name: "entity_entityId_createdAt" });
  await logs.createIndex({ actorId: 1, createdAt: -1 }, { name: "actorId_createdAt" });
  await logs.createIndex({ createdAt: -1 }, { name: "createdAt_desc" });
}

export async function down(db) {
  // Drops the audit trail. Only meant for development rollbacks.
  await db
    .collection("auditLogs")
    .drop()
    .catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
}
