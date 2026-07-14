"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
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
  const tCommon = useTranslations("Common");
  const tCatalog = useTranslations("Catalog");

  const price = product.discountPrice ?? product.basePrice;
  const name = product.translations[locale]?.name ?? product.translations.fr?.name;

  return (
    <div className="group flex flex-col">
      <Link
        href={`/catalogue/${product.slug}`}
        className="relative block aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10 transition-shadow duration-500 group-hover:ring-primary/40 dark:group-hover:shadow-[0_0_28px_-10px_var(--color-primary)]"
      >
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={name}
            fill
            className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        )}
        {product.discountPrice != null && (
          <span className="absolute end-3 top-3 rounded-full bg-primary px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-primary-foreground dark:shadow-[0_0_10px_var(--color-primary)]">
            {tCatalog("promoBadge")}
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 pt-4">
        <Link href={`/catalogue/${product.slug}`} className="font-medium leading-snug transition-colors hover:text-primary">
          {name}
        </Link>
        <div className="mt-1">
          <span className="font-mono text-sm tabular-nums text-muted-foreground">
            {price.toLocaleString()} {tCommon("currency")}
          </span>
        </div>
      </div>
    </div>
  );
}
