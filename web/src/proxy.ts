import { NextResponse, type NextRequest } from "next/server";
import { SESSION_HINT_COOKIE } from "@/lib/auth/session-hint";

const PRIVATE_PREFIXES = ["/dashboard", "/invoice", "/product", "/customer", "/report"];

const isPrivate = (path: string) => PRIVATE_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));

/** First-line routing by the session hint cookie. The (app) layout still verifies with the API. */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const signedIn = request.cookies.get(SESSION_HINT_COOKIE)?.value === "1";

  if (pathname === "/" || pathname === "/login") {
    if (signedIn) return NextResponse.redirect(new URL("/dashboard", request.url));
    return pathname === "/" ? NextResponse.redirect(new URL("/login", request.url)) : NextResponse.next();
  }

  if (isPrivate(pathname)) {
    if (!signedIn) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(login);
    }
    // Private pages are never cached, so Back after logout cannot show them from the cache.
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "no-store");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*", "/invoice/:path*", "/product/:path*", "/customer/:path*", "/report/:path*"],
};
