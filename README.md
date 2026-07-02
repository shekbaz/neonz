# NEONZ

Application de vente et personnalisation d'enseignes lumineuses néon LED — Next.js 16 (App Router), TypeScript, Tailwind CSS, MongoDB/Mongoose.

## Démarrage

1. Copier `.env.example` vers `.env.local` et renseigner au minimum `MONGODB_URI` et `NEXTAUTH_SECRET`.
2. Installer les dépendances :
   ```bash
   npm install
   ```
3. (Optionnel) Peupler la base avec des catégories/produits de démonstration et un compte admin (`admin@neonz.dz` / `Admin1234!`) :
   ```bash
   npm run seed
   ```
4. Lancer le serveur de développement :
   ```bash
   npm run dev
   ```
5. Ouvrir [http://localhost:3000](http://localhost:3000) (redirige vers `/fr`).

## Structure

- `src/lib/neon/` — moteur du configurateur : vectorisation (Potrace), texte→tracés (opentype.js), détection de collision, conversion px↔cm, pricing.
- `src/models/` — schémas Mongoose (`User`, `Product`, `Category`, `Order`, `CustomDesign`, `Review`).
- `src/app/api/` — routes REST (`/products`, `/orders`, `/customize/*`, `/checkout`, `/admin/*`).
- `src/app/[locale]/` — pages publiques + `/admin` (protégé par middleware, rôle `admin` requis).
- `src/components/configurator/` — wizard de personnalisation en 5 étapes.
- `src/messages/{fr,en,ar}.json` — traductions (l'arabe est servi en RTL automatiquement).

## Scripts

- `npm run dev` — serveur de développement
- `npm run build` — build de production
- `npm run lint` — ESLint
- `npm run seed` — peuple la base de données MongoDB avec des données de démonstration

## Variables d'environnement requises

Voir `.env.example`. Cloudinary et Stripe sont nécessaires respectivement pour l'upload d'images et le paiement en ligne ; sans eux, ces fonctionnalités précises échoueront proprement mais le reste de l'app fonctionne.
