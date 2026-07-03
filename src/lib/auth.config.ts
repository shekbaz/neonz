import type { NextAuthConfig } from "next-auth";

/**
 * Config NextAuth minimale, compatible Edge Runtime (aucun import bcrypt/
 * mongoose ici) — utilisée telle quelle par le middleware pour décoder la
 * session existante. La config complète (src/lib/auth.ts, avec le provider
 * Credentials et ses accès base) l'étend côté Node.js.
 */
export const authConfig: NextAuthConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/connexion" },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Render (comme la plupart des PaaS hors Vercel) est un reverse-proxy : sans ça,
  // Auth.js v5 rejette le Host header entrant avec une erreur "UntrustedHost".
  trustHost: true,
  providers: [],
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "client" | "admin";
      }
      return session;
    },
  },
};
