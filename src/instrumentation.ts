/**
 * Hook Next.js exécuté une seule fois au démarrage du serveur.
 *
 * Sur le plan gratuit Render, le service est mis en veille après 15 minutes
 * sans requête HTTP entrante. On programme donc un ping périodique (toutes
 * les 10 minutes, avant le seuil des 15) vers notre propre endpoint /api/health
 * pour maintenir une activité HTTP continue tant que le process est en vie.
 *
 * Limite connue : ce mécanisme ne peut réveiller un service déjà endormi
 * (le process ne tourne plus, donc plus de setInterval) — il ne fait que
 * l'empêcher de s'endormir une fois démarré. Pour un réveil garanti après
 * une longue inactivité (ex. premier visiteur du matin), il faut compléter
 * avec un service externe (UptimeRobot, cron-job.org, GitHub Actions cron...)
 * qui appelle /api/health depuis l'extérieur.
 */

const PING_INTERVAL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;

  const appUrl = process.env.RENDER_EXTERNAL_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.warn("[keep-alive] Aucune URL d'application configurée, self-ping désactivé.");
  } else {
    setInterval(async () => {
      try {
        await fetch(`${appUrl}/api/health`, { cache: "no-store" });
      } catch (error) {
        console.warn("[keep-alive] Échec du ping :", error instanceof Error ? error.message : error);
      }
    }, PING_INTERVAL_MS);
  }

  // Supprime les images uploadées dans le configurateur qui n'ont jamais été commandées
  // (voir src/lib/neon/cleanupUploads.ts). Ne s'exécute que tant que le process reste
  // en vie — même limite que le self-ping ci-dessus sur un plan Render gratuit.
  const { cleanupOrphanedUploads } = await import("@/lib/neon/cleanupUploads");
  setInterval(async () => {
    try {
      const { deleted, failed } = await cleanupOrphanedUploads();
      if (deleted || failed) {
        console.info(`[cleanup-uploads] ${deleted} image(s) orpheline(s) supprimée(s), ${failed} échec(s).`);
      }
    } catch (error) {
      console.warn("[cleanup-uploads] Échec du nettoyage :", error instanceof Error ? error.message : error);
    }
  }, CLEANUP_INTERVAL_MS);
}
