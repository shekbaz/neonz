import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ProductDeleteButton } from "@/components/admin/ProductDeleteButton";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";

export default async function AdminProductsPage() {
  await connectDB();
  const products = await Product.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">Produits</h1>
        <Link href="/admin/produits/nouveau">
          <Button size="sm">Ajouter un produit</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nom</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={String(p._id)}>
              <TableCell className="font-medium">{p.translations?.fr?.name}</TableCell>
              <TableCell>{p.basePrice.toLocaleString()} DZD</TableCell>
              <TableCell>{p.stock}</TableCell>
              <TableCell>
                <Badge variant={p.isActive ? "default" : "secondary"}>
                  {p.isActive ? "Actif" : "Inactif"}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <ProductDeleteButton productId={String(p._id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {products.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aucun produit.</p>}
    </div>
  );
}
