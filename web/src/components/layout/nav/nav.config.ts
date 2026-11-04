import type { Role } from "@/lib/auth/auth.types";

export type NavItem = {
  label: string;
  href: string;
  /** Match only this exact path (default: this path and everything below it). */
  exact?: boolean;
  /** Show only to these roles; omit for everyone. */
  roles?: Role[];
};

/** The single source of the main menu: add, remove or reorder items here only. */
export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", exact: true },
  { label: "Invoices", href: "/invoice" },
  { label: "Products", href: "/product" },
  { label: "Customers", href: "/customer" },
  { label: "Reports", href: "/report" },
];
