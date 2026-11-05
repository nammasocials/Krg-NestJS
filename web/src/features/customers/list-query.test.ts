import { describe, expect, it } from "vitest";
import {
  buildApiSearch,
  buildListSearch,
  pageAfterDelete,
  parseListQuery,
  rangeText,
  totalPagesOf,
} from "./list-query";

const parse = (search: string) => parseListQuery(new URLSearchParams(search));

describe("parseListQuery", () => {
  it("uses defaults for an empty address", () => {
    expect(parse("")).toEqual({ q: "", page: 1, pageSize: 10 });
  });

  it("reads q, page and pageSize", () => {
    expect(parse("?q=acme&page=3&pageSize=25")).toEqual({ q: "acme", page: 3, pageSize: 25 });
  });

  it("trims q and caps it at 100 characters", () => {
    expect(parse("?q=%20%20acme%20%20").q).toBe("acme");
    expect(parse(`?q=${"a".repeat(150)}`).q).toHaveLength(100);
  });

  it("falls back for odd pages", () => {
    for (const bad of ["abc", "0", "-1", "1.5", "", "1e3", "9999999", " 2"]) {
      expect(parse(`?page=${encodeURIComponent(bad)}`).page).toBe(1);
    }
  });

  it("falls back for a page size that is not 10, 25 or 50", () => {
    for (const bad of ["5", "100", "abc", "", "25.5"]) {
      expect(parse(`?pageSize=${bad}`).pageSize).toBe(10);
    }
    expect(parse("?pageSize=50").pageSize).toBe(50);
  });

  it("ignores unknown parameters", () => {
    expect(parse("?sort=email&x=1")).toEqual({ q: "", page: 1, pageSize: 10 });
  });
});

describe("buildListSearch", () => {
  it("is empty when everything is the default", () => {
    expect(buildListSearch({ q: "", page: 1, pageSize: 10 })).toBe("");
    expect(buildListSearch({ q: "   ", page: 1, pageSize: 10 })).toBe("");
  });

  it("includes only what differs from the default", () => {
    expect(buildListSearch({ q: "acme", page: 1, pageSize: 10 })).toBe("?q=acme");
    expect(buildListSearch({ q: "", page: 2, pageSize: 10 })).toBe("?page=2");
    expect(buildListSearch({ q: "", page: 1, pageSize: 50 })).toBe("?pageSize=50");
    expect(buildListSearch({ q: "acme", page: 2, pageSize: 25 })).toBe("?q=acme&page=2&pageSize=25");
  });

  it("encodes special characters and survives a round trip", () => {
    const query = { q: "A&B + Co. (India) #1/2 %", page: 4, pageSize: 25 as const };
    expect(parse(buildListSearch(query))).toEqual(query);
    expect(buildListSearch(query)).not.toMatch(/[ &]B|#/);
  });
});

describe("buildApiSearch", () => {
  it("always sends page and pageSize", () => {
    expect(buildApiSearch({ q: "", page: 1, pageSize: 10 })).toBe("?page=1&pageSize=10");
  });

  it("adds a trimmed q, encoded", () => {
    expect(buildApiSearch({ q: " a&b ", page: 2, pageSize: 25 })).toBe("?page=2&pageSize=25&q=a%26b");
  });
});

describe("rangeText", () => {
  it("describes the visible rows", () => {
    expect(rangeText(1, 10, 53)).toBe("Showing 1–10 of 53");
    expect(rangeText(2, 10, 53)).toBe("Showing 11–20 of 53");
    expect(rangeText(6, 10, 53)).toBe("Showing 51–53 of 53");
    expect(rangeText(1, 10, 1)).toBe("Showing 1–1 of 1");
  });

  it("handles none and a page past the end", () => {
    expect(rangeText(1, 10, 0)).toBe("No customers");
    expect(rangeText(9, 10, 53)).toBe("Showing 0 of 53");
  });
});

describe("totalPagesOf", () => {
  it("rounds up", () => {
    expect(totalPagesOf(0, 10)).toBe(0);
    expect(totalPagesOf(10, 10)).toBe(1);
    expect(totalPagesOf(11, 10)).toBe(2);
    expect(totalPagesOf(53, 25)).toBe(3);
  });
});

describe("pageAfterDelete", () => {
  it("steps back when the last row of a later page was removed", () => {
    expect(pageAfterDelete(3, 1)).toBe(2);
  });

  it("stays when other rows remain or it is the first page", () => {
    expect(pageAfterDelete(3, 4)).toBe(3);
    expect(pageAfterDelete(1, 1)).toBe(1);
  });
});
