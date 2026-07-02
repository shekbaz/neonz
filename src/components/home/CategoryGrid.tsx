import Image from "next/image";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/types/locale";

interface CategoryDoc {
  _id: string;
  slug: string;
  image?: string;
  translations: Record<Locale, { name: string }>;
}

export function CategoryGrid({ categories, locale }: { categories: CategoryDoc[]; locale: Locale }) {
  if (categories.length === 0) {
    return <p className="text-muted-foreground">Aucune catégorie disponible pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
      {categories.map((cat) => (
        <Link
          key={cat._id}
          href={{ pathname: "/catalogue", query: { category: cat.slug } }}
          className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border border-border bg-muted/50 p-4 text-center transition-all hover:border-primary/50 hover:bg-muted"
        >
          {cat.image && (
            <Image
              src={cat.image}
              alt={cat.translations[locale]?.name ?? cat.slug}
              fill
              className="object-cover opacity-30 transition-opacity group-hover:opacity-50"
            />
          )}
          <span className="relative z-10 text-sm font-semibold">
            {cat.translations[locale]?.name ?? cat.slug}
          </span>
        </Link>
      ))}
    </div>
  );
}
