import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface CategoryDoc {
  _id: string;
  slug: string;
  image?: string;
  translations: Record<Locale, { name: string }>;
}

export async function CategoryGrid({ categories, locale }: { categories: CategoryDoc[]; locale: Locale }) {
  if (categories.length === 0) {
    const t = await getTranslations("Home");
    return <p className="text-muted-foreground">{t("emptyCategories")}</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-6">
      {categories.map((cat) => (
        <Link
          key={cat._id}
          href={{ pathname: "/catalogue", query: { category: cat.slug } }}
          className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl bg-[oklch(0.17_0.03_272)] text-center ring-1 ring-foreground/10 transition-shadow duration-500 hover:ring-primary/50 dark:hover:shadow-[0_0_32px_-10px_var(--color-primary)]"
        >
          {cat.image && (
            <Image
              src={cat.image}
              alt={cat.translations[locale]?.name ?? cat.slug}
              fill
              className="object-cover opacity-50 transition duration-500 group-hover:scale-[1.04] group-hover:opacity-65"
            />
          )}
          <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[oklch(0.13_0.03_272/0.9)] to-transparent" aria-hidden />
          <span className="relative z-10 px-2 font-display text-xl font-semibold uppercase tracking-[0.08em] text-[oklch(0.95_0.01_80)] transition-all duration-500 group-hover:[text-shadow:0_0_12px_oklch(0.95_0.01_80/0.7)]">
            {cat.translations[locale]?.name ?? cat.slug}
          </span>
        </Link>
      ))}
    </div>
  );
}
