import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { ReviewModerationRow } from "@/components/admin/ReviewModerationRow";

export default async function AdminReviewsPage() {
  await connectDB();
  const reviews = await Review.find({ status: "pending" })
    .populate("user", "name")
    .sort({ createdAt: -1 })
    .lean();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">Avis en attente de modération</h1>

      <div className="space-y-3">
        {reviews.map((review) => (
          <ReviewModerationRow
            key={String(review._id)}
            reviewId={String(review._id)}
            comment={review.comment}
            rating={review.rating}
            authorName={(review.user as unknown as { name?: string })?.name ?? "Anonyme"}
          />
        ))}
      </div>

      {reviews.length === 0 && <p className="text-sm text-muted-foreground">Aucun avis en attente.</p>}
    </div>
  );
}
