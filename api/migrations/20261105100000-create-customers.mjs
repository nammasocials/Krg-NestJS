// E03-T022: the customers collection and its indexes. Safe to run twice (index specs are identical).

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "customers");
  const customers = db.collection("customers");
  // A GSTIN may be used once among customers that are not deleted. A partial filter cannot match
  // null, which is why soft delete is a boolean flag.
  await customers.createIndex(
    { gstin: 1 },
    {
      name: "gstin_unique_active",
      unique: true,
      partialFilterExpression: { isDeleted: false, gstin: { $type: "string" } },
    },
  );
  await customers.createIndex({ nameLower: 1, _id: 1 }, { name: "nameLower_id" });
  await customers.createIndex({ createdAt: -1, _id: -1 }, { name: "createdAt_id_desc" });
  await customers.createIndex({ isDeleted: 1 }, { name: "isDeleted" });
}

export async function down(db) {
  // Drops the collection, and with it the data. Only meant for development rollbacks.
  await db
    .collection("customers")
    .drop()
    .catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
}
