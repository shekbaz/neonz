"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCartStore } from "@/store/cartStore";
import { toast } from "sonner";

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const tCart = useTranslations("Cart");
  const { items, subtotal, clear } = useCartStore();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({ line1: "", city: "", wilaya: "", postalCode: "", country: "Algérie" });
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "cib" | "edahabia">("stripe");

  async function handleSubmit() {
    setLoading(true);
    try {
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({
            type: i.type,
            product: i.type === "catalog" ? i.id : undefined,
            customDesign: i.type === "custom" ? i.id : undefined,
            quantity: i.quantity,
          })),
          shippingAddress: address,
          paymentMethod,
        }),
      });

      if (!orderRes.ok) {
        const data = await orderRes.json();
        throw new Error(data.error?.toString() ?? "Erreur lors de la création de la commande.");
      }

      const order = await orderRes.json();

      if (paymentMethod === "stripe") {
        const checkoutRes = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: order._id }),
        });
        const checkoutData = await checkoutRes.json();
        if (checkoutData.url) {
          clear();
          window.location.href = checkoutData.url;
          return;
        }
        throw new Error(checkoutData.error ?? "Échec de l'initialisation du paiement.");
      }

      clear();
      router.push(`/commande/${order._id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <div className="space-y-6">
        <div>
          <h2 className="mb-4 font-semibold">{t("shippingAddress")}</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="line1">Adresse</Label>
              <Input id="line1" value={address.line1} onChange={(e) => setAddress({ ...address, line1: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">Ville</Label>
                <Input id="city" value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="wilaya">Wilaya</Label>
                <Input id="wilaya" value={address.wilaya} onChange={(e) => setAddress({ ...address, wilaya: e.target.value })} />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-semibold">{t("paymentMethod")}</h2>
          <div className="flex gap-3">
            {(["stripe", "cib", "edahabia"] as const).map((method) => (
              <button
                key={method}
                onClick={() => setPaymentMethod(method)}
                className={`rounded-lg border px-4 py-2 text-sm ${paymentMethod === method ? "border-primary bg-primary/20" : "border-white/10"}`}
              >
                {method.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-6">
          <span className="font-semibold">{tCart("subtotal")}</span>
          <span className="text-xl font-bold text-primary">
            {subtotal().toLocaleString()} {tCommon("currency")}
          </span>
        </div>

        <Button size="lg" className="w-full" disabled={loading || items.length === 0} onClick={handleSubmit}>
          {loading ? tCommon("loading") : t("placeOrder")}
        </Button>
      </div>
    </div>
  );
}
