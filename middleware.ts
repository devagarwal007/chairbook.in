import { NextResponse, type NextRequest } from "next/server";
import { getLinkedStylistAccount, getPostLoginPath, getRoleProfile } from "@/lib/auth-routing";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const ownerRoutes = ["/dashboard", "/onboarding"];
const stylistRoutes = ["/stylist"];
const authRoutes = ["/auth", "/signin"];

function startsWithRoute(pathname: string, routes: string[]) {
  return routes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function redirect(request: NextRequest, pathname: string, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  if (reason) {
    url.searchParams.set("reason", reason);
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requiresOwner = startsWithRoute(pathname, ownerRoutes);
  const requiresStylist = startsWithRoute(pathname, stylistRoutes);
  const isAuthRoute = startsWithRoute(pathname, authRoutes);

  if (!requiresOwner && !requiresStylist && !isAuthRoute) {
    return NextResponse.next();
  }

  const { supabase, response } = createSupabaseMiddlewareClient(request);

  if (!supabase) {
    return response;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return requiresOwner || requiresStylist ? redirect(request, "/signin") : response;
  }

  if (isAuthRoute) {
    return redirect(request, await getPostLoginPath(supabase, user.id));
  }

  const profile = await getRoleProfile(supabase, user.id);

  if (!profile) {
    return redirect(request, "/signin", "profile-missing");
  }

  if (requiresStylist) {
    if (profile.role !== "stylist") {
      return redirect(request, "/dashboard");
    }

    const linkedStylist = await getLinkedStylistAccount(supabase, user.id);
    if (!linkedStylist?.active) {
      return redirect(request, "/signin", "stylist-account-not-linked");
    }

    return response;
  }

  if (profile.role === "stylist") {
    const linkedStylist = await getLinkedStylistAccount(supabase, user.id);
    return redirect(request, linkedStylist?.active ? "/stylist" : "/signin", linkedStylist?.active ? undefined : "stylist-account-not-linked");
  }

  if (pathname.startsWith("/onboarding") && profile.org_id) {
    return redirect(request, "/dashboard");
  }

  if (pathname.startsWith("/dashboard") && !profile.org_id) {
    return redirect(request, "/onboarding");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
