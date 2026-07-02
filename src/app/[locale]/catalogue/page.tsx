import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { ProductCard } from "@/components/catalog/ProductCard";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import type { Locale } from "@/types/locale";

interface SearchParams {
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  color?: string;
}

export default async function CataloguePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: Locale }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations("Catalog");

  await connectDB();

  const filter: Record<string, unknown> = { isActive: true };
  if (sp.category) {
    const cat = await Category.findOne({ slug: sp.category });
    if (cat) filter.category = cat._id;
  }
  if (sp.color) filter.colors = sp.color;
  if (sp.minPrice || sp.maxPrice) {
    filter.basePrice = {
      ...(sp.minPrice ? { $gte: Number(sp.minPrice) } : {}),
      ...(sp.maxPrice ? { $lte: Number(sp.maxPrice) } : {}),
    };
  }

  const [products, categories] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).limit(48).lean(),
    Category.find().sort({ order: 1 }).lean(),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 text-3xl font-bold">{t("title")}</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[240px_1fr]">
        <CatalogFilters categories={JSON.parse(JSON.stringify(categories))} locale={locale} />

        {products.length === 0 ? (
          <p className="text-muted-foreground">{t("noResults")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} locale={locale} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
