import type { CookieOptions } from "express";

export const REFRESH_COOKIE = "refresh_token";

/** Only sent to the auth endpoints, never readable by page scripts. */
export const REFRESH_COOKIE_PATH = "/api/v1/auth";

export function refreshCookieOptions(production: boolean, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: production,
    path: REFRESH_COOKIE_PATH,
    maxAge: maxAgeMs,
  };
}

/** Options for clearing: must repeat path/flags, but not maxAge. */
export function clearRefreshCookieOptions(production: boolean): CookieOptions {
  return { httpOnly: true, sameSite: "lax", secure: production, path: REFRESH_COOKIE_PATH };
}
