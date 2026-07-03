import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // potrace (et sa dépendance jimp) utilise des APIs Node spécifiques qui
  // cassent quand Turbopack les bundle ("Right-hand side of 'instanceof' is
  // not callable") — on force le require natif côté serveur. `sharp` est déjà
  // externalisé par défaut par Next.
  serverExternalPackages: ["potrace"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
    // Nécessaire pour les visuels de démo locaux (public/demo/*.svg) — sûr ici
    // car ce sont des fichiers statiques que nous contrôlons, pas des uploads.
    dangerouslyAllowSVG: true,
  },
};

export default withNextIntl(nextConfig);
