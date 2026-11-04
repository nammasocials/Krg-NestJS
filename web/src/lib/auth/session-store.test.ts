import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api/client";
import {
  GENERIC_LOGIN_ERROR,
  INVALID_CREDENTIALS_MESSAGE,
  NETWORK_LOGIN_ERROR,
  createSessionStore,
} from "./session-store";

const user = { id: "1", username: "admin", fullName: "Admin User", role: "SUPER_ADMIN" as const };
const ok = (data: unknown) => new Response(JSON.stringify({ code: "OK", message: "ok", data }), { status: 200 });
const fail = (status: number, code: string, message: string) =>
  new Response(JSON.stringify({ code, message, data: null }), { status });
const tokens = () => ok({ accessToken: "tok", expiresIn: 900, user });

function make(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => handler(String(url), init)) as unknown as typeof fetch;
  const store = createSessionStore((hooks) => createApiClient({ fetchFn, runExclusive: (t) => t(), ...hooks }));
  return { store, fetchFn };
}

describe("session store", () => {
  it("starts in the loading state", () => {
    expect(make(() => ok(null)).store.getState()).toEqual({ status: "loading", user: null });
  });

  it("bootstrap: refresh then /auth/me gives an authenticated user", async () => {
    const { store, fetchFn } = make((url) => (url.endsWith("/auth/refresh") ? tokens() : ok(user)));
    await store.bootstrap();
    expect(store.getState()).toEqual({ status: "authenticated", user });
    expect((fetchFn as unknown as { mock: { calls: unknown[][] } }).mock.calls.map((c) => c[0])).toEqual([
      "/api/v1/auth/refresh",
      "/api/v1/auth/me",
    ]);
  });

  it("bootstrap without a valid cookie ends anonymous", async () => {
    const { store } = make(() => fail(401, "INVALID_SESSION", "expired"));
    await store.bootstrap();
    expect(store.getState()).toEqual({ status: "anonymous", user: null });
  });

  it("bootstrap when the API is unreachable ends anonymous", async () => {
    const store = createSessionStore((hooks) =>
      createApiClient({ fetchFn: (async () => { throw new TypeError("x"); }) as unknown as typeof fetch, runExclusive: (t) => t(), ...hooks }),
    );
    await store.bootstrap();
    expect(store.getState().status).toBe("anonymous");
  });

  it("bootstrap runs only once", async () => {
    const { store, fetchFn } = make((url) => (url.endsWith("/auth/refresh") ? tokens() : ok(user)));
    await Promise.all([store.bootstrap(), store.bootstrap()]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it("login success authenticates and keeps the token in memory", async () => {
    const { store } = make(() => tokens());
    expect(await store.login("admin", "pw")).toBeNull();
    expect(store.getState()).toEqual({ status: "authenticated", user });
    expect(store.client.getAccessToken()).toBe("tok");
  });

  it("login sends the credentials as JSON", async () => {
    const { store, fetchFn } = make(() => tokens());
    await store.login("admin", "pw");
    const [, init] = (fetchFn as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
    expect(JSON.parse(init.body as string)).toEqual({ username: "admin", password: "pw" });
  });

  it("login maps 401, 429, other errors and network failures to messages", async () => {
    expect(await make(() => fail(401, "INVALID_CREDENTIALS", "x")).store.login("a", "b")).toBe(INVALID_CREDENTIALS_MESSAGE);
    expect(await make(() => fail(429, "TOO_MANY_ATTEMPTS", "Too many attempts. Try again later.")).store.login("a", "b")).toBe(
      "Too many attempts. Try again later.",
    );
    expect(await make(() => fail(500, "ERR", "boom")).store.login("a", "b")).toBe(GENERIC_LOGIN_ERROR);
    const down = createSessionStore((hooks) =>
      createApiClient({ fetchFn: (async () => { throw new TypeError("x"); }) as unknown as typeof fetch, ...hooks }),
    );
    expect(await down.login("a", "b")).toBe(NETWORK_LOGIN_ERROR);
    expect(down.getState().status).toBe("loading");
  });

  it("a failed login does not try to refresh", async () => {
    const { store, fetchFn } = make(() => fail(401, "INVALID_CREDENTIALS", "x"));
    await store.login("a", "b");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("logout clears the token and user even when the call fails", async () => {
    const { store } = make((url) => (url.endsWith("/auth/logout") ? fail(500, "ERR", "x") : tokens()));
    await store.login("admin", "pw");
    await store.logout();
    expect(store.getState()).toEqual({ status: "anonymous", user: null, reason: "logout" });
    expect(store.client.getAccessToken()).toBeNull();
  });

  it("notifies subscribers and stops after unsubscribe", async () => {
    const { store } = make(() => tokens());
    const listener = vi.fn();
    const off = store.subscribe(listener);
    await store.login("a", "b");
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    await store.logout();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("goes anonymous when the API reports the session lost", async () => {
    const { store } = make((url) => {
      if (url.endsWith("/auth/login")) return tokens();
      if (url.endsWith("/auth/refresh")) return fail(401, "INVALID_SESSION", "x");
      return fail(401, "AUTH_REQUIRED", "x");
    });
    await store.login("a", "b");
    await store.client.request("/invoices").catch(() => undefined);
    expect(store.getState().status).toBe("anonymous");
  });
});
