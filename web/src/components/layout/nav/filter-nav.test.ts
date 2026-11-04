import { describe, expect, it } from "vitest";
import { canAccess, filterNav } from "./filter-nav";
import type { NavItem } from "./nav.config";

const items: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", exact: true },
  { label: "Users", href: "/user", roles: ["SUPER_ADMIN"] },
  { label: "Reports", href: "/report", roles: ["SUPER_ADMIN", "ADMIN"] },
];

describe("filterNav", () => {
  it("shows items without roles to everyone, including a missing role", () => {
    expect(filterNav(items, undefined).map((i) => i.label)).toEqual(["Dashboard"]);
  });
  it("shows gated items only to listed roles", () => {
    expect(filterNav(items, "ADMIN").map((i) => i.label)).toEqual(["Dashboard", "Reports"]);
    expect(filterNav(items, "SUPER_ADMIN").map((i) => i.label)).toEqual(["Dashboard", "Users", "Reports"]);
  });
  it("does not change the list when nothing is gated", () => {
    const open = items.slice(0, 1);
    expect(filterNav(open, "ADMIN")).toEqual(open);
  });
});

describe("canAccess", () => {
  it("allows open pages and listed roles, also below the page", () => {
    expect(canAccess(items, "/dashboard", "ADMIN")).toBe(true);
    expect(canAccess(items, "/user/5", "SUPER_ADMIN")).toBe(true);
    expect(canAccess(items, "/anything-else", "ADMIN")).toBe(true);
  });
  it("blocks other roles and a missing role on gated pages", () => {
    expect(canAccess(items, "/user", "ADMIN")).toBe(false);
    expect(canAccess(items, "/user/5", undefined)).toBe(false);
  });
});
