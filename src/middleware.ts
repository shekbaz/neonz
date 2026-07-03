import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Instance NextAuth dédiée au middleware, construite à partir de la config
// Edge-safe uniquement (@/lib/auth.config, sans provider ni accès base) —
// @/lib/auth (avec bcrypt/mongoose pour le login) n'est pas compatible avec
// l'Edge Runtime sur lequel tourne le middleware Next.js.
const { auth } = NextAuth(authConfig);

function stripLocale(pathname: string): string {
  const segments = pathname.split("/");
  if (routing.locales.includes(segments[1] as (typeof routing.locales)[number])) {
    return "/" + segments.slice(2).join("/");
  }
  return pathname;
}

// `auth()` en wrapper de middleware (plutôt que getToken() + secret manuel) :
// c'est la méthode officiellement recommandée par NextAuth v5 pour lire la
// session ici, garantissant la même logique de décodage que partout ailleurs
// dans l'app (auth.ts) — getToken() nécessitait de repasser le secret à la
// main et risquait de diverger subtilement (cf. historique des redirections
// vers /connexion malgré une session admin valide).
export default auth((request) => {
  const pathWithoutLocale = stripLocale(request.nextUrl.pathname);

  if (pathWithoutLocale.startsWith("/admin")) {
    const session = request.auth;

    if (!session?.user || session.user.role !== "admin") {
      const locale = request.nextUrl.pathname.split("/")[1] || routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/connexion`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathWithoutLocale);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
};
