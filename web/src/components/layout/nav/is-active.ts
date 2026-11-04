/**
 * Is the menu item for `href` the current page?
 * - exact: only the same path.
 * - otherwise: the same path or anything below it, on a segment boundary
 *   (`/customer` matches `/customer` and `/customer/123`, but not `/customers`).
 */
export function isActive(pathname: string, href: string, exact = false): boolean {
  const path = normalize(pathname);
  const target = normalize(href);
  if (path === target) return true;
  return !exact && path.startsWith(`${target}/`);
}

function normalize(p: string): string {
  return p.length > 1 && p.endsWith("/") ? p.slice(0, -1) : p;
}
