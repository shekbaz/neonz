import { connectDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { ProductForm } from "@/components/admin/ProductForm";

export default async function NewProductPage() {
  await connectDB();
  const categories = await Category.find().sort({ order: 1 }).lean();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">Nouveau produit</h1>
      <ProductForm categories={JSON.parse(JSON.stringify(categories))} />
    </div>
  );
}
