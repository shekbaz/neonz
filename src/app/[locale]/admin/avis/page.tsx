import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TestimonialDeleteButton } from "@/components/admin/TestimonialDeleteButton";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  approved: "Publié",
  pending: "En attente",
  rejected: "Rejeté",
};

export default async function AdminReviewsPage() {
  await connectDB();
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">Témoignages</h1>
        <Link href="/admin/avis/nouveau">
          <Button size="sm">Ajouter un témoignage</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Commentaire</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {reviews.map((r) => (
            <TableRow key={String(r._id)}>
              <TableCell className="font-medium">{r.authorName ?? "—"}</TableCell>
              <TableCell>{r.rating}/5</TableCell>
              <TableCell className="max-w-xs truncate">{r.comment}</TableCell>
              <TableCell>
                <Badge variant={r.status === "approved" ? "default" : "secondary"}>
                  {STATUS_LABELS[r.status ?? "pending"]}
                </Badge>
              </TableCell>
              <TableCell className="text-end">
                <Link href={`/admin/avis/${String(r._id)}`}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
                <TestimonialDeleteButton reviewId={String(r._id)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {reviews.length === 0 && <p className="mt-6 text-sm text-muted-foreground">Aucun témoignage.</p>}
    </div>
  );
}
