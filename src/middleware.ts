import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Only log real errors; ignore "auth session missing"
  if (error && error.message !== "Auth session missing!") {
    console.error("Middleware auth error:", error.message);
  }

  const protectedRoutes = ["/dashboard", "/active-services", "/feedback", "/services", "/subscribe"];

  // Redirect only if trying to access protected routes without auth
  if (
    !user &&
    protectedRoutes.some((route) => req.nextUrl.pathname.startsWith(route))
  ) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // If authenticated, enforce role-based access
  if (user) {
    if (req.nextUrl.pathname.startsWith("/feedback")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "customer") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    if (req.nextUrl.pathname.startsWith("/active-services")) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "service_provider") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
  }

  return res;
}
