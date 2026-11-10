import {
  DEFAULT_PAGE_SIZE,
  MAX_SEARCH_LENGTH,
  PAGE_SIZES,
  pageAfterDelete,
  totalPagesOf,
  type PageSize,
} from "@/features/customers/list-query";

export { DEFAULT_PAGE_SIZE, MAX_SEARCH_LENGTH, PAGE_SIZES, pageAfterDelete, totalPagesOf };
export type { PageSize };

export const SORTS = ["name", "-name", "unitPrice", "-unitPrice", "createdAt", "-createdAt"] as const;
export type Sort = (typeof SORTS)[number];
export const DEFAULT_SORT: Sort = "-createdAt";

export const ACTIVE_FILTERS = ["all", "true", "false"] as const;
export type ActiveFilter = (typeof ACTIVE_FILTERS)[number];

export const SORT_LABELS: Readonly<Record<Sort, string>> = {
  name: "Name (A–Z)",
  "-name": "Name (Z–A)",
  unitPrice: "Price (low to high)",
  "-unitPrice": "Price (high to low)",
  createdAt: "Oldest first",
  "-createdAt": "Newest first",
};

const MAX_PAGE = 100_000;

/** What the list shows, and exactly what lives in the address bar (`?q=&page=&pageSize=&sort=&active=`). */
export interface ListQuery {
  q: string;
  page: number;
  pageSize: PageSize;
  sort: Sort;
  active: ActiveFilter;
}

export const DEFAULT_QUERY: ListQuery = { q: "", page: 1, pageSize: DEFAULT_PAGE_SIZE, sort: DEFAULT_SORT, active: "all" };

interface ParamReader {
  get(name: string): string | null;
}

/** Reads the address bar. Anything missing or odd falls back to the default instead of failing. */
export function parseListQuery(params: ParamReader): ListQuery {
  const q = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  const rawPage = params.get("page");
  const page = rawPage !== null && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1;

  const size = Number(params.get("pageSize"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE;

  const rawSort = params.get("sort") ?? "";
  const sort = (SORTS as readonly string[]).includes(rawSort) ? (rawSort as Sort) : DEFAULT_SORT;

  const rawActive = params.get("active") ?? "";
  const active = (ACTIVE_FILTERS as readonly string[]).includes(rawActive) ? (rawActive as ActiveFilter) : "all";

  return { q, page: Math.min(Math.max(page, 1), MAX_PAGE), pageSize, sort, active };
}

/** `?q=rice&page=2` for the address bar; only what differs from the default. */
export function buildListSearch(query: ListQuery): string {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));
  if (query.sort !== DEFAULT_SORT) params.set("sort", query.sort);
  if (query.active !== "all") params.set("active", query.active);
  const s = params.toString();
  return s ? `?${s}` : "";
}

/** The query string for `GET /products`: always explicit, so the answer never depends on defaults. */
export function buildApiSearch(query: ListQuery): string {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sort: query.sort,
    active: query.active,
  });
  const q = query.q.trim();
  if (q) params.set("q", q);
  return `?${params.toString()}`;
}
