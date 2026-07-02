import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
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
