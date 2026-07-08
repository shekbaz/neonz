import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Color } from "@/models/Color";
import { Product } from "@/models/Product";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const [product, categories, colors] = await Promise.all([
    Product.findById(id).lean(),
    Category.find().sort({ order: 1 }).lean(),
    Color.find().sort({ createdAt: 1 }).lean(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">Modifier le produit</h1>
      <ProductForm
        categories={JSON.parse(JSON.stringify(categories))}
        colors={JSON.parse(JSON.stringify(colors))}
        productId={String(product._id)}
        initialData={JSON.parse(
          JSON.stringify({
            slug: product.slug,
            category: String(product.category),
            images: product.images,
            colors: product.colors,
            basePrice: product.basePrice,
            stock: product.stock,
            isCustomizable: product.isCustomizable,
            isFeatured: product.isFeatured,
            isActive: product.isActive,
            translations: product.translations,
            dimensions: product.dimensions,
          })
        )}
      />
    </div>
  );
}
