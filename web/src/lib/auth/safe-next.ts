import { NAV_ITEMS } from "@/components/layout/nav/nav.config";

export const DEFAULT_AFTER_LOGIN = "/dashboard";

/** Private areas a `next` address may point to: the menu pages. */
const KNOWN_PREFIXES = NAV_ITEMS.map((item) => item.href);

/**
 * Turns the `next` query value into a destination that is safe to redirect to:
 * a same-site path that starts with a single "/" and belongs to a known private area.
 * Anything else (other sites, "//host", backslashes, unknown paths) gives the dashboard.
 */
export function safeNext(raw: string | string[] | null | undefined): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string" || value.length > 2000) return DEFAULT_AFTER_LOGIN;
  if (!value.startsWith("/") || value.startsWith("//")) return DEFAULT_AFTER_LOGIN;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return DEFAULT_AFTER_LOGIN;

  let url: URL;
  try {
    url = new URL(value, "http://placeholder.invalid");
  } catch {
    return DEFAULT_AFTER_LOGIN;
  }
  if (url.origin !== "http://placeholder.invalid") return DEFAULT_AFTER_LOGIN;

  const known = KNOWN_PREFIXES.some((p) => url.pathname === p || url.pathname.startsWith(`${p}/`));
  return known ? `${url.pathname}${url.search}` : DEFAULT_AFTER_LOGIN;
}
