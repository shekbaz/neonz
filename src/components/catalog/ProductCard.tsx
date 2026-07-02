"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/store/cartStore";
import type { Locale } from "@/types/locale";

export interface ProductCardData {
  _id: string;
  slug: string;
  images: string[];
  basePrice: number;
  discountPrice?: number;
  translations: Record<Locale, { name: string; description: string }>;
}

export function ProductCard({ product, locale }: { product: ProductCardData; locale: Locale }) {
  const t = useTranslations("Catalog");
  const tCommon = useTranslations("Common");
  const addItem = useCartStore((s) => s.addItem);

  const price = product.discountPrice ?? product.basePrice;
  const name = product.translations[locale]?.name ?? product.translations.fr?.name;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/5">
      <Link href={`/catalogue/${product.slug}`} className="relative block aspect-square overflow-hidden bg-muted">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Link href={`/catalogue/${product.slug}`} className="font-semibold hover:text-primary">
          {name}
        </Link>
        <div className="mt-auto flex items-center justify-between">
          <span className="font-bold text-primary">
            {price.toLocaleString()} {tCommon("currency")}
          </span>
          <Button
            size="sm"
            variant="secondary"
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
      </div>
    </div>
  );
}
