"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/use-auth";
import { PRIMARY_ACTION } from "./status-page";
import { homeTarget } from "./status-page-target";

/** Link to the dashboard when signed in, otherwise to sign in. */
export function HomeLink({ className = PRIMARY_ACTION }: { className?: string }) {
  const { status } = useAuth();
  const { href, label } = homeTarget(status);
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}
