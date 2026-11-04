import { REFRESH_COOKIE_PATH, refreshCookieOptions } from "./refresh-cookie";
import { ttlToSeconds } from "./ttl";

describe("ttlToSeconds", () => {
  it.each([
    ["30s", 30],
    ["15m", 900],
    ["1h", 3600],
    ["2d", 172800],
  ])("%s → %i", (ttl, seconds) => expect(ttlToSeconds(ttl)).toBe(seconds));

  it("rejects an invalid value", () => {
    expect(() => ttlToSeconds("soon")).toThrow(/Invalid TTL/);
  });
});

describe("refreshCookieOptions", () => {
  it("is HttpOnly, Lax and limited to the auth path", () => {
    expect(refreshCookieOptions(false, 1000)).toEqual({
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: REFRESH_COOKIE_PATH,
      maxAge: 1000,
    });
  });

  it("is Secure in production", () => {
    expect(refreshCookieOptions(true, 1000).secure).toBe(true);
  });
});
