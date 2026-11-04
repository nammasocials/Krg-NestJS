import type { Role } from "@/lib/auth/auth.types";
import { isActive } from "./is-active";
import type { NavItem } from "./nav.config";

/** Items without `roles` are for everyone; items with `roles` only for those roles. */
export function filterNav(items: NavItem[], role: Role | undefined): NavItem[] {
  return items.filter((item) => !item.roles || (role !== undefined && item.roles.includes(role)));
}

/** False when the path belongs to a menu item that is limited to other roles. */
export function canAccess(items: NavItem[], pathname: string, role: Role | undefined): boolean {
  const gated = items.find((item) => item.roles && isActive(pathname, item.href, item.exact));
  return !gated || (role !== undefined && gated.roles!.includes(role));
}
