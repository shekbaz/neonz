import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Review } from "@/models/Review";
import { Hero } from "@/components/home/Hero";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ReviewsSection } from "@/components/home/ReviewsSection";
import type { Locale } from "@/types/locale";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Home");

  await connectDB();
  const [categories, featuredProducts, reviews] = await Promise.all([
    Category.find().sort({ order: 1 }).limit(6).lean(),
    Product.find({ isActive: true, isFeatured: true }).limit(8).lean(),
    Review.find({ status: "approved" }).sort({ createdAt: -1 }).limit(6).populate("user", "name").lean(),
  ]);

  return (
    <div>
      <Hero />

      <section className="mx-auto max-w-7xl border-t border-border/70 px-4 py-24 sm:px-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          <span className="tube-dash" aria-hidden />
          {t("eyebrowExplore")}
        </p>
        <h2 className="mb-10 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("categoriesTitle")}</h2>
        <CategoryGrid categories={JSON.parse(JSON.stringify(categories))} locale={locale} />
      </section>

      <section className="mx-auto max-w-7xl border-t border-border/70 px-4 py-24 sm:px-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          <span className="tube-dash" aria-hidden />
          {t("eyebrowSelection")}
        </p>
        <h2 className="mb-10 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("popularTitle")}</h2>
        {featuredProducts.length === 0 ? (
          <p className="text-muted-foreground">{t("noFeaturedProducts")}</p>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((p) => (
              <ProductCard key={String(p._id)} product={JSON.parse(JSON.stringify(p))} locale={locale} />
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl border-t border-border/70 px-4 py-24 sm:px-6">
        <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">
          <span className="tube-dash" aria-hidden />
          {t("eyebrowReviews")}
        </p>
        <h2 className="mb-10 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("reviewsTitle")}</h2>
        <ReviewsSection reviews={JSON.parse(JSON.stringify(reviews))} />
      </section>
    </div>
  );
}
