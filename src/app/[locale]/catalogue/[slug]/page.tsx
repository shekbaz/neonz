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
          <h1 className="text-3xl font-bold">{translation.name}</h1>
          <p className="mt-4 whitespace-pre-line text-muted-foreground">{translation.description}</p>

          <dl className="mt-6 space-y-2 text-sm">
            <div className="flex justify-between border-b border-white/10 py-2">
              <dt className="text-muted-foreground">{t("dimensions")}</dt>
              <dd>{plain.dimensions.width}cm x {plain.dimensions.height}cm</dd>
            </div>
            <div className="flex justify-between border-b border-white/10 py-2">
              <dt className="text-muted-foreground">{t("stock")}</dt>
              <dd>{plain.stock > 0 ? t("inStock") : t("outOfStock")}</dd>
            </div>
          </dl>

          <ProductBuyBox product={plain} locale={locale} />
        </div>
      </div>
    </div>
  );
}
