import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  // Admin dashboard: admin + employee only (fine-grained permission checks
  // happen per-page/action via hasPermission()).
  if (pathname.startsWith("/admin")) {
    if (!user || (user.role !== "admin" && user.role !== "employee")) {
      const url = new URL("/staff-login", req.nextUrl.origin);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  // Account area: any authenticated user (customers primarily).
  if (pathname.startsWith("/account")) {
    if (!user) {
      const url = new URL("/login", req.nextUrl.origin);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
