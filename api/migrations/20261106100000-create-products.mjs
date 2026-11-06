// E04-T031: the products collection and its indexes. Safe to run twice (index specs are identical).

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "products");
  const products = db.collection("products");
  // A product name (compared in lower case) may be used once among products that are not deleted.
  await products.createIndex(
    { nameLower: 1 },
    {
      name: "nameLower_unique_active",
      unique: true,
      partialFilterExpression: { isDeleted: false, nameLower: { $type: "string" } },
    },
  );
  await products.createIndex({ nameLower: 1, _id: 1 }, { name: "nameLower_id" });
  await products.createIndex({ createdAt: -1, _id: -1 }, { name: "createdAt_id_desc" });
  await products.createIndex({ isDeleted: 1, isActive: 1 }, { name: "isDeleted_isActive" });
}

export async function down(db) {
  // Drops the collection, and with it the data. Only meant for development rollbacks.
  await db
    .collection("products")
    .drop()
    .catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
}
