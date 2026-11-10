import { describe, expect, it } from "vitest";
import { buildApiSearch, buildListSearch, parseListQuery, type ListQuery } from "./list-query";

const parse = (search: string) => parseListQuery(new URLSearchParams(search));
const base: ListQuery = { q: "", page: 1, pageSize: 10, sort: "-createdAt", active: "all" };

describe("parseListQuery", () => {
  it("uses defaults for an empty address", () => {
    expect(parse("")).toEqual(base);
  });

  it("reads every parameter", () => {
    expect(parse("?q=rice&page=3&pageSize=25&sort=unitPrice&active=true")).toEqual({
      q: "rice",
      page: 3,
      pageSize: 25,
      sort: "unitPrice",
      active: "true",
    });
  });

  it("trims q and caps it at 100 characters", () => {
    expect(parse("?q=%20%20rice%20%20").q).toBe("rice");
    expect(parse(`?q=${"a".repeat(150)}`).q).toHaveLength(100);
  });

  it("falls back for odd pages, sizes, sorts and filters", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", "9999999"]) expect(parse(`?page=${bad}`).page).toBe(1);
    for (const bad of ["5", "100", "abc", ""]) expect(parse(`?pageSize=${bad}`).pageSize).toBe(10);
    for (const bad of ["stock", "name,createdAt", "NAME", "%24where"]) expect(parse(`?sort=${bad}`).sort).toBe("-createdAt");
    for (const bad of ["yes", "TRUE", "1", ""]) expect(parse(`?active=${bad}`).active).toBe("all");
  });
});

describe("buildListSearch", () => {
  it("is empty when everything is the default", () => {
    expect(buildListSearch(base)).toBe("");
    expect(buildListSearch({ ...base, q: "   " })).toBe("");
  });

  it("includes only what differs from the default", () => {
    expect(buildListSearch({ ...base, q: "rice" })).toBe("?q=rice");
    expect(buildListSearch({ ...base, sort: "name" })).toBe("?sort=name");
    expect(buildListSearch({ ...base, active: "false" })).toBe("?active=false");
    expect(buildListSearch({ ...base, page: 2, pageSize: 50 })).toBe("?page=2&pageSize=50");
  });

  it("survives a round trip with special characters", () => {
    const query: ListQuery = { q: "A&B + Co. (Deluxe) #1/2 %", page: 4, pageSize: 25, sort: "-unitPrice", active: "true" };
    expect(parse(buildListSearch(query))).toEqual(query);
  });
});

describe("buildApiSearch", () => {
  it("always sends page, pageSize, sort and active", () => {
    expect(buildApiSearch(base)).toBe("?page=1&pageSize=10&sort=-createdAt&active=all");
  });

  it("adds a trimmed, encoded q", () => {
    expect(buildApiSearch({ ...base, q: " a&b " })).toBe("?page=1&pageSize=10&sort=-createdAt&active=all&q=a%26b");
  });
});
