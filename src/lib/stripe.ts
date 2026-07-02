import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

/** Instanciation paresseuse : évite qu'un build sans STRIPE_SECRET_KEY configurée échoue. */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY n'est pas défini dans les variables d'environnement.");
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}
