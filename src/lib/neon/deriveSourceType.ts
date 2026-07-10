import type { NeonPath } from "@/types/neon";

/**
 * Le canvas unifié n'a plus "la" source unique (image OU texte OU dessin) :
 * chaque ajout tague ses tracés d'un `groupId` préfixé par son origine
 * (`image-*`, `text-*`, `draw-*`, voir Step1Create.tsx). On dérive le
 * `sourceType` à enregistrer sur la commande à partir de ces préfixes au
 * moment de la soumission plutôt que de le suivre comme un choix exclusif.
 */
export function deriveSourceType(paths: NeonPath[]): "image" | "text" | "draw" | "mixed" {
  const origins = new Set<"image" | "text" | "draw">();
  for (const p of paths) {
    if (p.groupId?.startsWith("image-")) origins.add("image");
    else if (p.groupId?.startsWith("text-")) origins.add("text");
    else if (p.groupId?.startsWith("draw-")) origins.add("draw");
  }
  if (origins.size === 1) return [...origins][0];
  if (origins.size > 1) return "mixed";
  return "draw";
}
