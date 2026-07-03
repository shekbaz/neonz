import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import type { Locale } from "@/types/locale";
import { ProductGallery } from "@/components/catalog/ProductGallery";
import { ProductBuyBox } from "@/components/catalog/ProductBuyBox";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: Locale; slug: string }>;
}) {
  const { locale, slug } = await params;
  const t = await getTranslations("Product");

  await connectDB();
  const product = await Product.findOne({ slug, isActive: true }).lean();
  if (!product) notFound();

  const plain = JSON.parse(JSON.stringify(product));
  const translation = plain.translations[locale] ?? plain.translations.fr;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
        <ProductGallery images={plain.images} name={translation.name} />

        <div>
          <h1 className="font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{translation.name}</h1>
          <p className="mt-5 whitespace-pre-line leading-relaxed text-muted-foreground">{translation.description}</p>

          <dl className="mt-8 space-y-2 text-sm">
            <div className="flex justify-between border-b border-border py-2.5">
              <dt className="text-muted-foreground">{t("dimensions")}</dt>
              <dd className="font-mono tabular-nums">{plain.dimensions.width}cm x {plain.dimensions.height}cm</dd>
            </div>
            <div className="flex justify-between border-b border-border py-2.5">
              <dt className="text-muted-foreground">{t("stock")}</dt>
              <dd className={plain.stock > 0 ? "font-medium text-emerald-600 dark:text-emerald-400" : "font-medium text-destructive"}>
                {plain.stock > 0 ? t("inStock") : t("outOfStock")}
              </dd>
            </div>
          </dl>

          <ProductBuyBox product={plain} locale={locale} />
        </div>
      </div>
    </div>
  );
}
