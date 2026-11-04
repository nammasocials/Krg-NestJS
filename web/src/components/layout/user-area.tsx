"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/shared/button";
import { useAuth } from "@/lib/auth/use-auth";
import { useLogout } from "@/lib/auth/use-logout";
import { formatRole, getInitial } from "@/lib/auth/user-display";

/**
 * Right side of the header.
 * - below 768 px: initial avatar only (Logout lives in the hamburger panel, see MobileNav)
 * - 768–1279 px: avatar + icon-only Logout (the full block does not fit next to the tabs)
 * - 1280 px and up: name, role chip and a Logout button
 */
export function UserArea() {
  const { user } = useAuth(); // AuthGate only renders the header for a signed-in user
  const { logout, pending } = useLogout();
  if (!user) return null;
  const label = pending ? "Signing out…" : "Logout";

  return (
    <>
      <div className="hidden items-center gap-3 xl:flex">
        <div className="text-right leading-tight">
          <p className="text-sm font-semibold text-gray-800">{user.fullName}</p>
          <p className="mt-0.5 inline-block rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-brand-primary">
            {formatRole(user.role)}
          </p>
        </div>
        <Button variant="destructive" onClick={logout} disabled={pending} aria-busy={pending}>
          <LogOut className="size-4" aria-hidden="true" />
          {label}
        </Button>
      </div>

      <span
        aria-label={`Signed in as ${user.fullName}, ${formatRole(user.role)}`}
        title={`${user.fullName} (${formatRole(user.role)})`}
        className="flex size-9 items-center justify-center rounded-full bg-brand-primary text-sm font-semibold text-white xl:hidden"
      >
        {getInitial(user.fullName)}
      </span>

      <Button
        variant="destructive"
        size="icon"
        onClick={logout}
        disabled={pending}
        aria-busy={pending}
        aria-label={label}
        title={label}
        className="hidden md:inline-flex xl:hidden"
      >
        <LogOut className="size-4" aria-hidden="true" />
      </Button>
    </>
  );
}
