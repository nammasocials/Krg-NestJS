/**
 * The address (path + query) to go to when a click on a link would leave this page, or null when the
 * click should be left alone (new tab, modifier key, download, other site, same page, hash only).
 * Kept apart from React so it can be tested.
 */
export function leavingHref(
  link: { href: string; target?: string; download?: boolean },
  click: { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean },
  current: { origin: string; href: string },
): string | null {
  if (click.button !== 0 || click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) return null;
  if (link.download || (link.target && link.target !== "_self")) return null;
  let url: URL;
  try {
    url = new URL(link.href, current.href);
  } catch {
    return null;
  }
  if (url.origin !== current.origin) return null;
  const here = new URL(current.href);
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
