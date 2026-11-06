import type { TokenResponse } from "@/lib/auth/auth.types";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** A request that never got an answer (offline, API down). */
export class NetworkError extends Error {
  constructor() {
    super("Could not reach the server.");
    this.name = "NetworkError";
  }
}

type RunExclusive = <T>(task: () => Promise<T>) => Promise<T>;

export interface ApiClientOptions {
  fetchFn?: typeof fetch;
  baseUrl?: string;
  /** Runs a task while no other tab of this browser refreshes (a Web Lock in the browser). */
  runExclusive?: RunExclusive;
  /** Called when the session can no longer be refreshed. */
  onSessionLost?: () => void;
  /** Called with every new token pair, including the user. */
  onTokens?: (tokens: TokenResponse) => void;
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Do not attempt a refresh when the answer is 401 (login, refresh, logout). */
  skipRefresh?: boolean;
}

const REFRESH_LOCK = "krg-refresh";

/** One refresh at a time per browser: the API treats a second use of a refresh token as theft. */
const browserLock: RunExclusive = async (task) =>
  typeof navigator !== "undefined" && navigator.locks
    ? await navigator.locks.request(REFRESH_LOCK, task)
    : await task();

export function createApiClient(options: ApiClientOptions = {}) {
  const baseUrl = options.baseUrl ?? "/api/v1";
  const runExclusive = options.runExclusive ?? browserLock;
  let accessToken: string | null = null;
  let refreshing: Promise<boolean> | null = null;

  const doFetch = (...args: Parameters<typeof fetch>) => (options.fetchFn ?? fetch)(...args);

  async function send(path: string, opts: RequestOptions): Promise<Response> {
    const { body, skipRefresh: _skip, headers, ...rest } = opts;
    void _skip;
    const h = new Headers(headers);
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    // For FormData the browser sets the multipart Content-Type (with its boundary) itself.
    if (body !== undefined && !isForm) h.set("Content-Type", "application/json");
    if (accessToken) h.set("Authorization", `Bearer ${accessToken}`);
    try {
      return await doFetch(`${baseUrl}${path}`, {
        ...rest,
        headers: h,
        credentials: "include",
        body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
      });
    } catch {
      throw new NetworkError();
    }
  }

  async function parse<T>(res: Response): Promise<T> {
    let payload: { code?: string; message?: string; data?: unknown } | null = null;
    try {
      payload = await res.json();
    } catch {
      /* empty or non-JSON body */
    }
    if (!res.ok) {
      throw new ApiError(res.status, payload?.code ?? "ERROR", payload?.message ?? "Request failed.", payload?.data);
    }
    return payload?.data as T;
  }

  /** Gets a new access token with the refresh cookie. Parallel callers share one request. */
  function refresh(): Promise<boolean> {
    refreshing ??= runExclusive(async () => {
      try {
        const res = await send("/auth/refresh", { method: "POST", skipRefresh: true });
        const tokens = await parse<TokenResponse>(res);
        accessToken = tokens.accessToken;
        options.onTokens?.(tokens);
        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          accessToken = null;
          return false;
        }
        throw err; // network trouble is not a lost session
      }
    }).finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** Sends, and on 401 refreshes once and sends again. Returns the final response, parsed by the caller. */
  async function sendWithRefresh(path: string, opts: RequestOptions): Promise<Response> {
    const tokenUsed = accessToken;
    let res = await send(path, opts);
    if (res.status === 401 && !opts.skipRefresh) {
      // Another request may already have renewed the token while this one was in flight.
      const renewed = accessToken !== null && accessToken !== tokenUsed ? true : await refresh();
      if (!renewed) {
        options.onSessionLost?.();
        return res;
      }
      res = await send(path, opts);
      if (res.status === 401) options.onSessionLost?.();
    }
    return res;
  }

  async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
    return parse<T>(await sendWithRefresh(path, opts));
  }

  /** For binary answers such as the logo image. Errors are raised like `request` does. */
  async function requestBlob(path: string, opts: RequestOptions = {}): Promise<Blob> {
    const res = await sendWithRefresh(path, opts);
    if (!res.ok) return parse<never>(res);
    return res.blob();
  }

  return {
    request,
    requestBlob,
    refresh,
    setAccessToken(token: string | null) {
      accessToken = token;
    },
    getAccessToken: () => accessToken,
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
