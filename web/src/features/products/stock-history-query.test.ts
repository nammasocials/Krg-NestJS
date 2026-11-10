import { describe, expect, it } from "vitest";
import { parseHistoryQuery, toApiSearch, withHistoryQuery } from "./stock-history-query";

const read = (s: string) => parseHistoryQuery(new URLSearchParams(s));

describe("parseHistoryQuery", () => {
  it("defaults", () => expect(read("")).toEqual({ page: 1, pageSize: 10 }));
  it("reads hpage and hsize", () => expect(read("hpage=3&hsize=25")).toEqual({ page: 3, pageSize: 25 }));
  it.each(["0", "-1", "abc", "1.5", "1234567", ""])("ignores page %j", (v) => expect(read(`hpage=${v}`).page).toBe(1));
  it.each(["7", "100", "abc"])("ignores size %j", (v) => expect(read(`hsize=${v}`).pageSize).toBe(10));
  it("does not read the list's own parameters", () => expect(read("page=4&pageSize=50")).toEqual({ page: 1, pageSize: 10 }));
});

describe("withHistoryQuery", () => {
  it("keeps other parameters and drops defaults", () => {
    expect(withHistoryQuery("q=rice&hpage=2", { page: 1, pageSize: 10 })).toBe("?q=rice");
    expect(withHistoryQuery("", { page: 2, pageSize: 25 })).toBe("?hpage=2&hsize=25");
    expect(withHistoryQuery("", { page: 1, pageSize: 10 })).toBe("");
  });
});

describe("toApiSearch", () => {
  it("builds the API query", () => expect(toApiSearch({ page: 2, pageSize: 50 })).toBe("?page=2&pageSize=50"));
});
