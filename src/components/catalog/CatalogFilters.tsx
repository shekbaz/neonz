"use client";

import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { NEON_COLORS } from "@/types/neon";
import { cn } from "@/lib/utils";
import type { Locale } from "@/types/locale";

interface CategoryDoc {
  _id: string;
  slug: string;
  translations: Record<Locale, { name: string }>;
}

export function CatalogFilters({ categories, locale }: { categories: CategoryDoc[]; locale: Locale }) {
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
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("categoryLabel")}</h3>
        <div className="flex flex-col gap-1">
          {categories.map((cat) => (
            <button
              key={cat._id}
              onClick={() => updateParam("category", activeCategory === cat.slug ? null : cat.slug)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-start text-sm transition-colors hover:bg-muted",
                activeCategory === cat.slug && "bg-primary/20 text-primary"
              )}
            >
              {cat.translations[locale]?.name ?? cat.slug}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">{t("colorLabel")}</h3>
        <div className="flex flex-wrap gap-2">
          {NEON_COLORS.map((color) => (
            <button
              key={color.id}
              onClick={() => updateParam("color", activeColor === color.id ? null : color.id)}
              className={cn(
                "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                activeColor === color.id ? "border-foreground" : "border-transparent"
              )}
              style={{ backgroundColor: color.hex }}
              aria-label={color.label}
            />
          ))}
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
        {t("resetFilters")}
      </Button>
    </aside>
  );
}
