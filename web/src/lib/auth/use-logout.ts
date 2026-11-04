"use client";

import { useState } from "react";
import { useAuth } from "./use-auth";

/**
 * Signs out: asks the API to end the session, clears the in-memory state either way, and
 * AuthGate then moves the browser to /login. `pending` drives the "Signing out…" label.
 */
export function useLogout() {
  const { logout } = useAuth();
  const [pending, setPending] = useState(false);

  async function run() {
    if (pending) return;
    setPending(true);
    await logout(); // never throws; the page is replaced right after
  }
  return { logout: run, pending };
}
