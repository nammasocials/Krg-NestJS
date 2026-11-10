// E05-T039: the stockMovements collection and its indexes. Safe to run twice (index specs are identical).

async function ensureCollection(db, name) {
  const existing = await db.listCollections({ name }).toArray();
  if (existing.length === 0) await db.createCollection(name);
}

export async function up(db) {
  await ensureCollection(db, "stockMovements");
  const movements = db.collection("stockMovements");
  // A product's history, newest first; _id breaks ties so pages never overlap or skip.
  await movements.createIndex({ productId: 1, createdAt: -1, _id: -1 }, { name: "productId_createdAt_id_desc" });
  // Which movements an invoice caused (sales and cancellations); only rows that have an invoice are indexed.
  await movements.createIndex({ invoiceId: 1 }, { name: "invoiceId_sparse", sparse: true });
}

export async function down(db) {
  // Drops the collection, and with it the history. Only meant for development rollbacks.
  await db
    .collection("stockMovements")
    .drop()
    .catch((err) => {
      if (err.codeName !== "NamespaceNotFound") throw err;
    });
}
