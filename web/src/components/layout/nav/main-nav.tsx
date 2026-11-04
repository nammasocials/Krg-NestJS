"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/use-auth";
import { filterNav } from "./filter-nav";
import { NAV_ITEMS } from "./nav.config";
import { isActive } from "./is-active";

/** Desktop tab bar (shown from 768 px). Mobile uses <MobileNav />. */
export function MainNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-1 lg:gap-2 xl:gap-6">
        {filterNav(NAV_ITEMS, user?.role).map((item) => {
          const active = isActive(pathname, item.href, item.exact);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block border-b-2 px-2 py-2 font-bold lg:px-3 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active
                    ? "border-brand-primary text-brand-primary"
                    : "border-transparent text-gray-600 hover:text-brand-primary",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
