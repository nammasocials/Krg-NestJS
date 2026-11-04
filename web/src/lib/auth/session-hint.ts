/**
 * A plain "you look signed in" cookie for the Next.js proxy. The real refresh cookie is HttpOnly and
 * only sent to /api/v1/auth, so page requests never carry it. This one holds no secret and grants
 * nothing: the API still checks every token. A stale or forged hint only changes which page is
 * shown first; the (app) layout then asks the API and sends signed-out users to /login.
 */
export const SESSION_HINT_COOKIE = "krg_session";

const MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // same as the default refresh lifetime

export function setSessionHint(signedIn: boolean): void {
  if (typeof document === "undefined") return;
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = signedIn
    ? `${SESSION_HINT_COOKIE}=1; Path=/; Max-Age=${MAX_AGE_SECONDS}; SameSite=Lax${secure}`
    : `${SESSION_HINT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
}
