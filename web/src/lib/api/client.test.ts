import { describe, expect, it, vi } from "vitest";
import { ApiError, NetworkError, createApiClient } from "./client";

const user = { id: "1", username: "admin", fullName: "Admin", role: "ADMIN" as const };
const ok = (data: unknown) => new Response(JSON.stringify({ code: "OK", message: "ok", data }), { status: 200 });
const fail = (status: number, code = "ERR", message = "nope") =>
  new Response(JSON.stringify({ code, message, data: null }), { status });
const tokens = (t: string) => ok({ accessToken: t, expiresIn: 900, user });

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>;
function setup(handler: Handler, extra: Parameters<typeof createApiClient>[0] = {}) {
  const calls: { url: string; auth: string | null; credentials?: RequestCredentials }[] = [];
  const fetchFn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const h = new Headers(init?.headers);
    calls.push({ url: String(url), auth: h.get("Authorization"), credentials: init?.credentials });
    return handler(String(url), init ?? {});
  }) as unknown as typeof fetch;
  const client = createApiClient({ fetchFn, ...extra });
  return { client, calls };
}

describe("api client", () => {
  it("sends the token and cookies and returns the unwrapped data", async () => {
    const { client, calls } = setup(() => ok({ hello: 1 }));
    client.setAccessToken("tok");
    await expect(client.request("/x")).resolves.toEqual({ hello: 1 });
    expect(calls[0]).toEqual({ url: "/api/v1/x", auth: "Bearer tok", credentials: "include" });
  });

  it("sends FormData as is, without a JSON content type", async () => {
    let seen: { body: unknown; type: string | null } | null = null;
    const { client } = setup((_url, init) => {
      seen = { body: init.body, type: new Headers(init.headers).get("Content-Type") };
      return ok(null);
    });
    const form = new FormData();
    form.append("file", new Blob(["x"]));
    await client.request("/up", { method: "PUT", body: form });
    expect(seen).toEqual({ body: form, type: null });
  });

  it("requestBlob returns the bytes, retries after a 401 and raises ApiError on failure", async () => {
    let n = 0;
    const { client, calls } = setup((url) => {
      if (url.endsWith("/auth/refresh")) return tokens("new");
      if (url.endsWith("/missing")) return fail(404, "NOT_FOUND", "no logo");
      return ++n === 1 ? fail(401) : new Response("img", { status: 200 });
    });
    client.setAccessToken("old");
    const blob = await client.requestBlob("/logo");
    expect(await blob.text()).toBe("img");
    expect(calls.at(-1)?.auth).toBe("Bearer new");
    await expect(client.requestBlob("/missing")).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  it("on 401 refreshes once and retries once with the new token", async () => {
    let n = 0;
    const { client, calls } = setup((url) => {
      if (url.endsWith("/auth/refresh")) return tokens("new");
      return ++n === 1 ? fail(401) : ok("done");
    });
    client.setAccessToken("old");
    await expect(client.request("/x")).resolves.toBe("done");
    expect(calls.map((c) => [c.url, c.auth])).toEqual([
      ["/api/v1/x", "Bearer old"],
      ["/api/v1/auth/refresh", "Bearer old"],
      ["/api/v1/x", "Bearer new"],
    ]);
  });

  it("shares one refresh between parallel 401s", async () => {
    const { client, calls } = setup(async (url, init) => {
      if (url.endsWith("/auth/refresh")) {
        await new Promise((r) => setTimeout(r, 10));
        return tokens("new");
      }
      return new Headers(init.headers).get("Authorization") === "Bearer new" ? ok("ok") : fail(401);
    });
    client.setAccessToken("old");
    const results = await Promise.all([client.request("/a"), client.request("/b"), client.request("/c")]);
    expect(results).toEqual(["ok", "ok", "ok"]);
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
  });

  it("runs refreshes through the exclusive lock", async () => {
    let locked = 0;
    const { client } = setup((url) => (url.endsWith("/auth/refresh") ? tokens("t") : ok(1)), {
      runExclusive: (task) => {
        locked++;
        return task();
      },
    });
    await client.refresh();
    expect(locked).toBe(1);
  });

  it("reports a lost session and surfaces the 401 when the refresh is refused", async () => {
    const onSessionLost = vi.fn();
    const { client } = setup((url) => (url.endsWith("/auth/refresh") ? fail(401, "INVALID_SESSION") : fail(401, "AUTH_REQUIRED", "Sign in")), {
      onSessionLost,
    });
    await expect(client.request("/x")).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
    expect(onSessionLost).toHaveBeenCalledTimes(1);
    expect(client.getAccessToken()).toBeNull();
  });

  it("does not loop: a second 401 after a refresh is returned", async () => {
    const { client, calls } = setup((url) => (url.endsWith("/auth/refresh") ? tokens("new") : fail(401)));
    await expect(client.request("/x")).rejects.toBeInstanceOf(ApiError);
    expect(calls).toHaveLength(3);
  });

  it("skipRefresh returns the 401 without refreshing", async () => {
    const { client, calls } = setup(() => fail(401, "INVALID_CREDENTIALS", "bad"));
    await expect(client.request("/auth/login", { method: "POST", body: {}, skipRefresh: true })).rejects.toMatchObject({ status: 401 });
    expect(calls).toHaveLength(1);
  });

  it("maps a failed fetch to NetworkError and keeps the session on refresh network failure", async () => {
    const onSessionLost = vi.fn();
    const fetchFn = vi.fn(async () => {
      throw new TypeError("failed");
    }) as unknown as typeof fetch;
    const client = createApiClient({ fetchFn, onSessionLost });
    await expect(client.request("/x")).rejects.toBeInstanceOf(NetworkError);
    await expect(client.refresh()).rejects.toBeInstanceOf(NetworkError);
    expect(onSessionLost).not.toHaveBeenCalled();
  });

  it("can refresh again after a refresh finished", async () => {
    const { client, calls } = setup(() => tokens("t"));
    await client.refresh();
    await client.refresh();
    expect(calls).toHaveLength(2);
  });
});
