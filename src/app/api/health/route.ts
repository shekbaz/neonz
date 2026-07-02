import { NextResponse } from "next/server";

/**
 * Endpoint de health-check, appelé en interne toutes les 10 minutes
 * (voir src/instrumentation.ts) pour maintenir l'activité HTTP du service
 * et éviter la mise en veille par inactivité du plan gratuit Render.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", time: new Date().toISOString() });
}
