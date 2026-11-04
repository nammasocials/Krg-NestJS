import { ApiError, type ApiClient, type ApiClientOptions, createApiClient } from "@/lib/api/client";
import type { AuthState, SessionUser, TokenResponse } from "./auth.types";

export const GENERIC_LOGIN_ERROR = "Something went wrong. Please try again.";
export const NETWORK_LOGIN_ERROR = "Could not reach the server. Check your connection and try again.";
export const INVALID_CREDENTIALS_MESSAGE = "Invalid username or password";

/** Holds who is signed in. Plain TypeScript so it is easy to test; React reads it via AuthProvider. */
type Hooks = Pick<ApiClientOptions, "onTokens" | "onSessionLost">;

export function createSessionStore(clientFactory: (hooks: Hooks) => ApiClient = createApiClient) {
  let state: AuthState = { status: "loading", user: null };
  const listeners = new Set<() => void>();
  let bootstrapping: Promise<void> | null = null;

  const set = (next: AuthState) => {
    state = next;
    listeners.forEach((l) => l());
  };

  const client = clientFactory({
    onTokens: (t: TokenResponse) => set({ status: "authenticated", user: t.user }),
    onSessionLost: () => set({ status: "anonymous", user: null }),
  });

  return {
    client,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    /** On page load: trade the refresh cookie for a token, then read the user from the API. */
    bootstrap(): Promise<void> {
      bootstrapping ??= (async () => {
        try {
          if (!(await client.refresh())) return set({ status: "anonymous", user: null });
          const user = await client.request<SessionUser>("/auth/me");
          set({ status: "authenticated", user });
        } catch {
          // Offline or API down: not signed in as far as this page can tell.
          set({ status: "anonymous", user: null });
        }
      })();
      return bootstrapping;
    },

    /** Resolves with an error message to show, or null on success. */
    async login(username: string, password: string): Promise<string | null> {
      try {
        const tokens = await client.request<TokenResponse>("/auth/login", {
          method: "POST",
          body: { username, password },
          skipRefresh: true,
        });
        client.setAccessToken(tokens.accessToken);
        set({ status: "authenticated", user: tokens.user });
        return null;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 401) return INVALID_CREDENTIALS_MESSAGE;
          if (err.status === 429) return err.message;
          return GENERIC_LOGIN_ERROR;
        }
        return NETWORK_LOGIN_ERROR;
      }
    },

    async logout(): Promise<void> {
      try {
        await client.request("/auth/logout", { method: "POST", skipRefresh: true });
      } catch {
        /* the cookie may be left behind if offline; the local session ends anyway */
      }
      client.setAccessToken(null);
      set({ status: "anonymous", user: null, reason: "logout" });
    },
  };
}

export type SessionStore = ReturnType<typeof createSessionStore>;
