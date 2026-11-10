import { DEFAULT_PAGE_SIZE, PAGE_SIZES, type PageSize } from "@/features/customers/list-query";

/** The history's own address parameters, so they do not clash with anything else on the page. */
export const PAGE_PARAM = "hpage";
export const SIZE_PARAM = "hsize";

export interface HistoryQuery {
  page: number;
  pageSize: PageSize;
}

interface ParamReader {
  get(name: string): string | null;
}

/** Reads `?hpage=&hsize=`; anything missing or odd falls back to page 1 and the default size. */
export function parseHistoryQuery(params: ParamReader): HistoryQuery {
  const rawPage = params.get(PAGE_PARAM);
  const page = rawPage !== null && /^\d{1,6}$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : 1;
  const size = Number(params.get(SIZE_PARAM));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(size) ? (size as PageSize) : DEFAULT_PAGE_SIZE;
  return { page, pageSize };
}

/** The query string (with `?`, or empty) after changing the history's page/size, keeping every other parameter. */
export function withHistoryQuery(current: string, next: HistoryQuery): string {
  const params = new URLSearchParams(current);
  if (next.page > 1) params.set(PAGE_PARAM, String(next.page));
  else params.delete(PAGE_PARAM);
  if (next.pageSize !== DEFAULT_PAGE_SIZE) params.set(SIZE_PARAM, String(next.pageSize));
  else params.delete(SIZE_PARAM);
  const text = params.toString();
  return text ? `?${text}` : "";
}

/** The API's query string for the history. */
export const toApiSearch = ({ page, pageSize }: HistoryQuery): string => `?page=${page}&pageSize=${pageSize}`;
