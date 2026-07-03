"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import type { Locale } from "@/types/locale";

interface ProductPlain {
  _id: string;
  slug: string;
  images: string[];
  basePrice: number;
  discountPrice?: number;
  colors: string[];
  stock: number;
  translations: Record<Locale, { name: string }>;
}

export function ProductBuyBox({ product, locale }: { product: ProductPlain; locale: Locale }) {
  const t = useTranslations("Product");
  const tCommon = useTranslations("Common");
  const addItem = useCartStore((s) => s.addItem);
  const [selectedColor, setSelectedColor] = useState(product.colors[0]);

  const price = product.discountPrice ?? product.basePrice;
  const name = product.translations[locale]?.name ?? product.translations.fr?.name;

  return (
    <div className="mt-8">
      <div className="font-display text-5xl font-bold tracking-[0.02em] text-primary">
        {price.toLocaleString()} <span className="text-2xl">{tCommon("currency")}</span>
      </div>

      {product.colors.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("colors")}</p>
          <div className="flex gap-2">
            {product.colors.map((color) => (
              <button
                key={color}
                onClick={() => setSelectedColor(color)}
                className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-background transition-all ${selectedColor === color ? "scale-110 ring-2 ring-foreground/70" : "hover:scale-105"}`}
                style={{
                  backgroundColor: color,
                  boxShadow: selectedColor === color ? `0 0 10px ${color}` : undefined,
                }}
                aria-pressed={selectedColor === color}
              />
            ))}
          </div>
        </div>
      )}

      <Button
        size="lg"
        className="glow-primary mt-8 h-12 w-full text-base"
        disabled={product.stock <= 0}
        onClick={() =>
          addItem({
            id: product._id,
            type: "catalog",
            name,
            image: product.images[0],
            unitPrice: price,
            quantity: 1,
          })
        }
      >
        {t("addToCart")}
      </Button>
    </div>
  );
}
