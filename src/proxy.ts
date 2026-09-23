import { type NextRequest, NextResponse } from "next/server";

/**
 * Optimistic check only: no cookie → the login page, before rendering anything. The real
 * authorisation is the data-access layer (src/server/auth/dal.ts) on every query and action.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has("asl_session")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/health|_next/static|_next/image|favicon.ico).*)"],
};
