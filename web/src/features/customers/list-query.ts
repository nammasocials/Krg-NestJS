export const PAGE_SIZES = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZES)[number];
export const DEFAULT_PAGE_SIZE: PageSize = 10;
export const MAX_SEARCH_LENGTH = 100;
const MAX_PAGE = 100_000;

/** What the list page shows, and exactly what lives in the address bar (`?q=&page=&pageSize=`). */
export interface ListQuery {
  q: string;
  page: number;
  pageSize: PageSize;
}

export const DEFAULT_QUERY: ListQuery = { q: "", page: 1, pageSize: DEFAULT_PAGE_SIZE };

interface ParamReader {
  get(name: string): string | null;
}

/**
 * Reads the address-bar parameters. Anything missing or odd (`page=abc`, `pageSize=7`) falls back to
 * the default instead of failing, because the address can be typed or edited by anyone.
 */
export function parseListQuery(params: ParamReader): ListQuery {
  const q = (params.get("q") ?? "").trim().slice(0, MAX_SEARCH_LENGTH);

  const rawPage = params.get("page");
  const page = rawPage !== null && /^\d{1,6}$/.test(rawPage) ? Number(rawPage) : 1;

  const size = Number(params.get("pageSize"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE;

  return { q, page: Math.min(Math.max(page, 1), MAX_PAGE), pageSize };
}

function toParams(query: ListQuery): URLSearchParams {
  const params = new URLSearchParams();
  const q = query.q.trim();
  if (q) params.set("q", q);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(query.pageSize));
  return params;
}

/** `?q=acme&page=2` for the address bar; empty when everything is the default. */
export function buildListSearch(query: ListQuery): string {
  const s = toParams(query).toString();
  return s ? `?${s}` : "";
}

/** The query string for `GET /customers`: always explicit, so the answer never depends on defaults. */
export function buildApiSearch(query: ListQuery): string {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  const q = query.q.trim();
  if (q) params.set("q", q);
  return `?${params.toString()}`;
}

/** "Showing 11–20 of 53"; "No customers" when there are none. */
export function rangeText(page: number, pageSize: number, total: number): string {
  if (total <= 0) return "No customers";
  const from = (page - 1) * pageSize + 1;
  if (from > total) return `Showing 0 of ${total}`;
  const to = Math.min(page * pageSize, total);
  return `Showing ${from}–${to} of ${total}`;
}

export const totalPagesOf = (total: number, pageSize: number): number => Math.ceil(Math.max(total, 0) / pageSize);

/** The page to open after a row was deleted: one step back when it was the only row of the page. */
export function pageAfterDelete(page: number, rowsOnPage: number): number {
  return rowsOnPage <= 1 && page > 1 ? page - 1 : page;
}
