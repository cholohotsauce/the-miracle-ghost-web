import { NextResponse, type NextRequest } from "next/server";
import { isLaunched, TEASER_HOSTS, TEASER_PATH } from "@/lib/launch";

/** Before launch, every page on the public domain shows the teaser. After launch, the teaser sends people home. */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const launched = isLaunched();

  if (launched) {
    if (pathname === TEASER_PATH) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (!TEASER_HOSTS.includes(host) || pathname === TEASER_PATH) return NextResponse.next();

  // Rewrite, not redirect: the address bar keeps what the visitor typed
  return NextResponse.rewrite(new URL(TEASER_PATH, request.url));
}

export const config = {
  // Pages only: skip the API (the teaser's email sign-up uses it), Next's own files, and anything with a
  // file extension (images, models, icons, robots.txt, sitemap.xml, share images)
  matcher: ["/((?!api/|_next/|.*\\.[^/]+$).*)"],
};
