import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { auth } from "@/lib/auth";

const POLL_INTERVAL_MS = 5000;

/**
 * Flux SSE simple : notifie l'admin dès qu'une nouvelle commande "pending"
 * apparaît. Suffisant pour un flux à sens unique serveur -> admin sans
 * dépendre d'un service WebSocket tiers payant.
 */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") {
    return new Response("Accès réservé aux administrateurs.", { status: 403 });
  }

  await connectDB();
  let lastKnownCount = await Order.countDocuments({ status: "pending" });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const interval = setInterval(async () => {
        try {
          const currentCount = await Order.countDocuments({ status: "pending" });
          if (currentCount > lastKnownCount) {
            const latest = await Order.findOne({ status: "pending" }).sort({ createdAt: -1 });
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "new_order", orderNumber: latest?.orderNumber })}\n\n`
              )
            );
          }
          lastKnownCount = currentCount;
        } catch {
          // Une erreur transitoire de polling ne doit pas fermer le flux SSE.
        }
      }, POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
