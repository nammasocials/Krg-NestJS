"use client";

import { createContext, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import type { AuthState } from "./auth.types";
import { setSessionHint } from "./session-hint";
import { createSessionStore, type SessionStore } from "./session-store";

export interface AuthContextValue extends AuthState {
  /** Resolves with a message to show, or null when signed in. */
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const SERVER_STATE: AuthState = { status: "loading", user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  // One store per page load; the access token lives only in its memory.
  const [store] = useState<SessionStore>(() => {
    const s = createSessionStore();
    // Keep the proxy's session hint in step with the verified state (see session-hint.ts).
    s.subscribe(() => {
      const { status } = s.getState();
      if (status !== "loading") setSessionHint(status === "authenticated");
    });
    return s;
  });

  const state = useSyncExternalStore(store.subscribe, store.getState, () => SERVER_STATE);

  useEffect(() => {
    void store.bootstrap();
  }, [store]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login: store.login, logout: store.logout }),
    [state, store],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
