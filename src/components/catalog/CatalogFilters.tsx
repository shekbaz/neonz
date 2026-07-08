"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

interface CategoryDoc {
  _id: string;
  slug: string;
  translations: Record<Locale, { name: string }>;
}

interface ColorDoc {
  _id: string;
  name: string;
  hex: string;
}

export function CatalogFilters({
  categories,
  colors,
  locale,
}: {
  categories: CategoryDoc[];
  colors: ColorDoc[];
  locale: Locale;
}) {
  const t = useTranslations("Catalog");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeCategory = searchParams.get("category");
  const activeColor = searchParams.get("color");

  function updateParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <aside className="space-y-8">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("categoryLabel")}</h3>
        <div className="flex flex-col gap-0.5">
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => updateParam("category", activeCategory === cat.slug ? null : cat.slug)}
              className={cn(
                "rounded-md border-s-2 border-transparent px-3 py-1.5 text-start text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                activeCategory === cat.slug && "border-primary bg-primary/10 font-medium text-primary"
              )}
            >
              {cat.translations[locale]?.name ?? cat.slug}
            </button>
          ))}
        </div>
      </div>

      {colors.length > 0 && (
        <div>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("colorLabel")}</h3>
          <div className="flex flex-wrap gap-2">
            {colors.map((color) => (
              <button
                key={color._id}
                onClick={() => updateParam("color", activeColor === color.hex ? null : color.hex)}
                className={cn(
                  "h-7 w-7 rounded-full ring-offset-2 ring-offset-background transition-all hover:scale-110",
                  activeColor === color.hex && "scale-110 ring-2 ring-foreground/70"
                )}
                style={{
                  backgroundColor: color.hex,
                  boxShadow: activeColor === color.hex ? `0 0 10px ${color.hex}` : undefined,
                }}
                aria-label={color.name}
                aria-pressed={activeColor === color.hex}
              />
            ))}
          </div>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
        {t("resetFilters")}
      </Button>
    </aside>
  );
}
