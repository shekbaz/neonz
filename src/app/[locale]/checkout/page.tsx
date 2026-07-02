"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

interface CreatedOrder {
  orderNumber: string;
  total: number;
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const { data: session } = useSession();
  const { items, subtotal, clear } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  const [guest, setGuest] = useState({ name: "", phone: "", email: "" });
  const [address, setAddress] = useState({ line1: "", city: "", wilaya: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            type: i.type,
            product: i.type === "catalog" ? i.id : undefined,
            customDesign: i.type === "custom" ? i.id : undefined,
            quantity: i.quantity,
          })),
          shippingAddress: { ...address, country: "Algérie" },
          guestInfo: session?.user ? undefined : guest,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() ?? "Erreur lors de l'envoi de la commande.");
      }

      const order = await res.json();
      setCreatedOrder({ orderNumber: order.orderNumber, total: order.total });
      clear();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  if (createdOrder) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Commande envoyée !</h1>
        <p className="mt-2 text-muted-foreground">
          Votre commande <span className="font-semibold text-foreground">{createdOrder.orderNumber}</span> a bien été reçue.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 p-4 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          <span>Nous allons vous appeler très prochainement pour confirmer votre commande.</span>
        </div>
        <p className="mt-6 text-lg font-bold text-primary">
          {createdOrder.total.toLocaleString()} {tCommon("currency")}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">
        Remplissez vos coordonnées, nous vous appelons pour confirmer la commande — aucun paiement en ligne requis.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {!session?.user && (
          <div>
            <h2 className="mb-4 font-semibold">Vos coordonnées</h2>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" required value={guest.name} onChange={(e) => setGuest({ ...guest, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="phone">Téléphone</Label>
                <Input id="phone" type="tel" required placeholder="05XX XX XX XX" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="email">E-mail (optionnel)</Label>
                <Input id="email" type="email" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-4 font-semibold">{t("shippingAddress")}</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="line1">Adresse</Label>
              <Input id="line1" required value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="wilaya">Wilaya</Label>
                <Input id="wilaya" value={address.wilaya} onChange={(e) => setAddress({ ...address, wilaya: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-6">
          <span className="font-semibold">Total</span>
          <span className="text-xl font-bold text-primary">
            {subtotal().toLocaleString()} {tCommon("currency")}
          </span>
        </div>

        <Button size="lg" className="w-full" disabled={loading || items.length === 0} type="submit">
          {loading ? tCommon("loading") : "Envoyer ma commande"}
        </Button>
      </form>
    </div>
  );
}
