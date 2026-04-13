import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookieName, verifySession } from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/login",
  "/forgot-password",
  "/change-password",
  "/",
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/api")) return NextResponse.next();
  if (pathname.startsWith("/_next")) return NextResponse.next();
  if (pathname.startsWith("/favicon")) return NextResponse.next();

  const cookie = req.cookies.get(getSessionCookieName())?.value;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!cookie) {
    return isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
  }

  try {
    const session = await verifySession(cookie);

    if (pathname === "/" || pathname === "/login") {
      const dest =
        session.role === "ADMIN"
          ? "/admin"
          : session.role === "OPCO"
            ? "/opco"
            : session.role === "PARTNER"
              ? "/partner"
              : "/client";
      return NextResponse.redirect(new URL(dest, req.url));
    }

    if (pathname.startsWith("/admin") && session.role !== "ADMIN")
      return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/opco") && session.role !== "OPCO")
      return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/partner") && session.role !== "PARTNER")
      return NextResponse.redirect(new URL("/login", req.url));
    if (pathname.startsWith("/client") && session.role !== "CLIENT" && session.role !== "ADMIN")
      return NextResponse.redirect(new URL("/login", req.url));

    return NextResponse.next();
  } catch {
    const res = isPublic ? NextResponse.next() : NextResponse.redirect(new URL("/login", req.url));
    res.cookies.set(getSessionCookieName(), "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};

