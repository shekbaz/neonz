"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCartStore } from "@/store/cartStore";

export default function CartPage() {
  const t = useTranslations("Cart");
  const tCommon = useTranslations("Common");
  const { items, removeItem, updateQuantity, subtotal } = useCartStore();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>

      {items.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-muted/50 p-4">
                <div className="relative h-20 w-20 overflow-hidden rounded-lg bg-muted">
                  {item.image && <Image src={item.image} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{item.name}</p>
                  <p className="text-sm text-primary">
                    {item.unitPrice.toLocaleString()} {tCommon("currency")}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => updateQuantity(item.id, Number(e.target.value))}
                  className="w-20"
                />
                <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                  {t("remove")}
                </Button>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-border pt-6">
            <span className="text-lg font-semibold">{t("subtotal")}</span>
            <span className="text-2xl font-bold text-primary">
              {subtotal().toLocaleString()} {tCommon("currency")}
            </span>
          </div>

          <Link href="/checkout">
            <Button size="lg" className="mt-6 w-full">
              {t("checkout")}
            </Button>
          </Link>
        </>
      )}
    </div>
  );
}
