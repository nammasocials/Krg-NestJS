/** Fields that change on every write or are derived; they never count as "something changed". */
const IGNORED = new Set(["updatedAt", "updatedBy", "createdAt", "createdBy", "nameLower"]);
/** Never stored in an audit row, wherever they appear. */
const DENY = new Set(["passwordHash", "tokenHash", "__v"]);

export type Snapshot = Record<string, unknown>;

const isBinary = (v: unknown) => v instanceof Uint8Array || v instanceof ArrayBuffer;
const isObjectId = (v: unknown) =>
  typeof v === "object" && v !== null && (v as { _bsontype?: string })._bsontype === "ObjectId";

/** A plain, JSON-safe copy: ids and dates become strings; secrets and file bytes are left out. */
export function sanitize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (isBinary(value)) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (isObjectId(value)) return String(value);
  if (Array.isArray(value)) return value.map(sanitize).filter((v) => v !== undefined);
  const out: Snapshot = {};
  for (const [key, v] of Object.entries(value as Snapshot)) {
    if (DENY.has(key)) continue;
    const clean = sanitize(v);
    if (clean !== undefined) out[key] = clean;
  }
  return out;
}

/** Dotted paths of every leaf; arrays count as one leaf. `{address:{city:"x"}}` gives `address.city`. */
function leaves(value: Snapshot, prefix = "", into = new Map<string, string>()) {
  for (const [key, v] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) leaves(v as Snapshot, path, into);
    else into.set(path, JSON.stringify(v));
  }
  return into;
}

/** Sorted dotted paths whose value differs between the two snapshots. */
export function changedFields(before: Snapshot | undefined, after: Snapshot | undefined): string[] {
  const a = leaves(before ?? {});
  const b = leaves(after ?? {});
  const paths = new Set([...a.keys(), ...b.keys()]);
  return [...paths].filter((p) => !IGNORED.has(p.split(".")[0]) && a.get(p) !== b.get(p)).sort();
}
