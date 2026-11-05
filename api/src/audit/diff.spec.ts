import { Types } from "mongoose";
import { changedFields, sanitize } from "./diff";

describe("sanitize", () => {
  it("turns ids and dates into strings", () => {
    const id = new Types.ObjectId();
    const out = sanitize({ id, at: new Date("2026-01-02T03:04:05Z"), n: 1, ok: true, none: null });
    expect(out).toEqual({ id: id.toString(), at: "2026-01-02T03:04:05.000Z", n: 1, ok: true, none: null });
  });

  it("removes secrets at any depth, including inside arrays", () => {
    const out = sanitize({
      name: "x",
      passwordHash: "$argon2id$secret",
      nested: { tokenHash: "abc", keep: 1 },
      list: [{ tokenHash: "t", v: 2 }],
      __v: 3,
    });
    expect(out).toEqual({ name: "x", nested: { keep: 1 }, list: [{ v: 2 }] });
    expect(JSON.stringify(out)).not.toMatch(/argon2|secret|tokenHash|passwordHash/);
  });

  it("removes file bytes", () => {
    const out = sanitize({ name: "logo", bytes: Buffer.from("PNGDATA"), raw: new Uint8Array([1, 2]), list: [Buffer.from("x")] });
    expect(out).toEqual({ name: "logo", list: [] });
  });

  it("drops undefined values", () => {
    expect(sanitize({ a: undefined, b: 1 })).toEqual({ b: 1 });
  });

  it("does not change its input", () => {
    const input = { passwordHash: "x", at: new Date(0) };
    sanitize(input);
    expect(input.passwordHash).toBe("x");
    expect(input.at).toBeInstanceOf(Date);
  });
});

describe("changedFields", () => {
  it("lists changed leaves with dotted paths, sorted", () => {
    const before = { name: "A", address: { line: "1", city: "X" }, phone: "9" };
    const after = { name: "B", address: { line: "1", city: "Y" }, phone: "9" };
    expect(changedFields(before, after)).toEqual(["address.city", "name"]);
  });

  it("is empty for equal snapshots", () => {
    expect(changedFields({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } })).toEqual([]);
  });

  it("sees added, removed and array changes", () => {
    expect(changedFields({ a: 1 }, { a: 1, b: 2 })).toEqual(["b"]);
    expect(changedFields({ a: 1, b: 2 }, { a: 1 })).toEqual(["b"]);
    expect(changedFields({ tags: [1, 2] }, { tags: [2, 1] })).toEqual(["tags"]);
  });

  it("ignores bookkeeping and derived fields", () => {
    const before = { name: "A", updatedAt: "1", updatedBy: "u1", nameLower: "a" };
    const after = { name: "A", updatedAt: "2", updatedBy: "u2", nameLower: "b" };
    expect(changedFields(before, after)).toEqual([]);
  });

  it("treats a missing side as empty (create lists every field)", () => {
    expect(changedFields(undefined, { name: "A", address: { city: "X" } })).toEqual(["address.city", "name"]);
  });

  it("distinguishes null, empty string and missing", () => {
    expect(changedFields({ a: null }, { a: "" })).toEqual(["a"]);
    expect(changedFields({ a: null }, {})).toEqual(["a"]);
  });
});
