import { z } from "zod";

export const loginSchema = z.object({
  // Pas de .email() ici : seul le compte admin se connecte (pas d'inscription
  // visiteur), et son identifiant n'est pas forcément un email — voir
  // SEED_ADMIN_EMAIL dans scripts/seed.ts.
  email: z.string().min(1),
  password: z.string().min(1),
});

export type LoginInput = z.infer<typeof loginSchema>;
