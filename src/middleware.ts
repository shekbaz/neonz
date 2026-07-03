import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  if (routing.locales.includes(segments[1] as (typeof routing.locales)[number])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

export default async function middleware(request: NextRequest) {
  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);

  if (pathWithoutLocale.startsWith("/admin")) {
    // Doit correspondre exactement au secret utilisé par NextAuth (src/lib/auth.ts)
    // pour signer le JWT — un secret différent invaliderait silencieusement le
    // token et provoquerait une boucle de redirection vers /connexion.
    const token = await getToken({
      req: request,
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
    });

    if (!token || token.role !== "admin") {
      const locale = request.nextUrl.pathname.split("/")[1] || routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/connexion`, request.url);
      // Sans préfixe de locale : router.push (next-intl) le rajoute déjà à la
      // redirection post-connexion, un pathname déjà préfixé le dupliquerait.
      loginUrl.searchParams.set("callbackUrl", pathWithoutLocale);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
