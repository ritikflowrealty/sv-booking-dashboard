import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isOnLogin = req.nextUrl.pathname === "/login";

  if (isOnDashboard && !isLoggedIn) {
    return Response.redirect(new URL("/login", req.url));
  }

  if (isOnLogin && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.url));
  }

  return undefined;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
