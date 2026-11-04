import type { AuthStatus } from "@/lib/auth/auth.types";

/** Where the button on the not-found and error pages leads, by session state. */
export function homeTarget(status: AuthStatus): { href: string; label: string } {
  return status === "authenticated"
    ? { href: "/dashboard", label: "Go to dashboard" }
    : { href: "/login", label: "Go to sign in" };
}
