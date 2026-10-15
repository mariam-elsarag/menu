import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const { url, publishableKey } = getSupabasePublicConfig();
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });

        Object.entries(cacheHeaders).forEach(([name, value]) => {
          supabaseResponse.headers.set(name, value);
        });
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;

  const isDashboardRoute =
    request.nextUrl.pathname === "/dashboard" ||
    request.nextUrl.pathname.startsWith("/dashboard/");
  const isDashboardLoginRoute =
    request.nextUrl.pathname === "/dashboard/login";
  const isLoginRoute =
    isDashboardLoginRoute || request.nextUrl.pathname === "/login";
  const isRootRoute = request.nextUrl.pathname === "/";
  const isAuthenticated = !error && Boolean(claims);

  function redirectWithSession(pathname: string) {
    const response = NextResponse.redirect(new URL(pathname, request.url));

    supabaseResponse.cookies.getAll().forEach((cookie) => {
      response.cookies.set(cookie);
    });

    for (const headerName of ["cache-control", "expires", "pragma"]) {
      const value = supabaseResponse.headers.get(headerName);
      if (value) response.headers.set(headerName, value);
    }

    return response;
  }

  if (isDashboardRoute && !isDashboardLoginRoute && !isAuthenticated) {
    return redirectWithSession("/dashboard/login");
  }

  if (isRootRoute || isLoginRoute) {
    if (isAuthenticated) return redirectWithSession("/dashboard/categories");
    if (isRootRoute || request.nextUrl.pathname === "/login") {
      return redirectWithSession("/dashboard/login");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
