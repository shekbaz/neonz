import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TestimonialDeleteButton } from "@/components/admin/TestimonialDeleteButton";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export default async function AdminReviewsPage() {
  const t = await getTranslations("Admin");
  const tStatus = await getTranslations("Admin.reviewStatus");
  await connectDB();
  const reviews = await Review.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("reviews")}</h1>
        <Link href="/admin/avis/nouveau">
          <Button size="sm">{t("reviewsPage.addTestimonial")}</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("reviewsPage.colClient")}</TableHead>
            <TableHead>{t("reviewsPage.colRating")}</TableHead>
            <TableHead>{t("reviewsPage.colComment")}</TableHead>
            <TableHead>{t("reviewsPage.colStatus")}</TableHead>
            <TableHead className="text-end">{t("reviewsPage.colActions")}</TableHead>
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
                  {tStatus((r.status ?? "pending") as never)}
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

      {reviews.length === 0 && <p className="mt-6 text-sm text-muted-foreground">{t("reviewsPage.empty")}</p>}
    </div>
  );
}
