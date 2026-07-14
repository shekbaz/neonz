"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "@/i18n/navigation";
import { calculateDeposit } from "@/lib/neon/pricing";
import { toast } from "sonner";

interface CreatedOrder {
  orderNumber: string;
  total: number;
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const itemType = searchParams.get("type");
  const itemId = searchParams.get("id");
  const itemName = searchParams.get("name") ?? "";
  const unitPrice = Number(searchParams.get("price") ?? "0");

  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  const [contact, setContact] = useState({ name: "", phone: "" });
  const [address, setAddress] = useState({ city: "", wilaya: "" });

  useEffect(() => {
    if (session?.user?.name) {
      setContact((c) => (c.name ? c : { ...c, name: session.user.name ?? "" }));
    }
  }, [session]);

  const total = unitPrice * quantity;
  const depositAmount = itemType === "custom" ? calculateDeposit(total) : 0;
  const hasValidItem = (itemType === "catalog" || itemType === "custom") && !!itemId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!hasValidItem) return;
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              type: itemType,
              product: itemType === "catalog" ? itemId : undefined,
              customDesign: itemType === "custom" ? itemId : undefined,
              quantity,
            },
          ],
          shippingAddress: { ...address, country: "Algérie" },
          contactName: contact.name,
          contactPhone: contact.phone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.toString() ?? t("errorSubmit"));
      }

      const order = await res.json();
      setCreatedOrder({ orderNumber: order.orderNumber, total: order.total });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorGeneric"));
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
        <h1 className="mt-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("orderSentTitle")}</h1>
        <p className="mt-2 text-muted-foreground">
          {t.rich("orderReceivedText", {
            orderNumber: createdOrder.orderNumber,
            bold: (chunks) => <span className="font-semibold text-foreground">{chunks}</span>,
          })}
        </p>
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-border bg-muted/50 p-4 text-sm">
          <Phone className="h-4 w-4 text-primary" />
          <span>{t("willCallText")}</span>
        </div>
        <p className="mt-6 text-lg font-bold text-primary">
          {createdOrder.total.toLocaleString()} {tCommon("currency")}
        </p>
      </div>
    );
  }

  if (!hasValidItem) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center sm:px-6">
        <p className="text-muted-foreground">
          {t("noItemText")}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/catalogue">
            <Button variant="secondary">{t("viewCatalog")}</Button>
          </Link>
          <Link href="/personnaliser">
            <Button>{t("createNeon")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="mb-2 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>
      <p className="mb-8 text-muted-foreground">
        {t("fillDetailsText")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex items-center gap-4 rounded-2xl border border-border bg-muted/50 p-4">
          <div className="flex-1">
            <p className="font-semibold">{itemName}</p>
            <p className="text-sm text-primary">
              {unitPrice.toLocaleString()} {tCommon("currency")}
            </p>
          </div>
          <Input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
            className="w-20"
          />
        </div>

        {itemType === "custom" ? (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
            <p className="font-semibold text-foreground">{t("depositNoticeTitle")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("depositNotice", {
                deposit: depositAmount.toLocaleString(),
                balance: (total - depositAmount).toLocaleString(),
                currency: tCommon("currency"),
              })}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-muted/50 p-4 text-sm text-muted-foreground">
            {t("codNotice")}
          </div>
        )}

        <div>
          <h2 className="mb-4 font-semibold">{t("yourDetails")}</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="name">{t("fullName")}</Label>
              <Input id="name" required value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="phone">{t("phone")}</Label>
              <Input id="phone" type="tel" required placeholder={t("phonePlaceholder")} value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            </div>
          </div>
        </div>

        <div>
          <h2 className="mb-4 font-semibold">{t("shippingAddress")}</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">{t("city")}</Label>
              <Input id="city" required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="wilaya">{t("wilaya")}</Label>
              <Input id="wilaya" required value={address.wilaya} onChange={(e) => setAddress({ ...address, wilaya: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-6">
          <span className="font-semibold">{tCommon("total")}</span>
          <span className="text-xl font-bold text-primary">
            {total.toLocaleString()} {tCommon("currency")}
          </span>
        </div>

        <Button size="lg" className="w-full" disabled={loading} type="submit">
          {loading ? tCommon("loading") : t("submitOrder")}
        </Button>
      </form>
    </div>
  );
}
