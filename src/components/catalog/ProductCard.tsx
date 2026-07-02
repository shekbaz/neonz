"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
    <div className="group flex flex-col">
      <Link href={`/catalogue/${product.slug}`} className="relative block aspect-square overflow-hidden rounded-2xl bg-muted">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <Link href={`/catalogue/${product.slug}`} className="font-medium transition-colors hover:text-primary">
          {name}
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {price.toLocaleString()} {tCommon("currency")}
          </span>
          <button
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
            className="text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 max-md:opacity-100"
          >
            {t("addToCart")}
          </button>
        </div>
      </div>
    </div>
  );
}
