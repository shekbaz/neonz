import { Star } from "lucide-react";

interface ReviewDoc {
  _id: string;
  rating: number;
  comment: string;
  user: { name: string };
}

export function ReviewsSection({ reviews }: { reviews: ReviewDoc[] }) {
  if (reviews.length === 0) {
    return <p className="text-muted-foreground">Aucun avis pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <div key={review._id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="mb-2 flex gap-0.5 text-primary">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-4 w-4" fill={i < review.rating ? "currentColor" : "none"} />
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{review.comment}</p>
          <p className="mt-3 text-sm font-semibold">{review.user?.name}</p>
        </div>
      ))}
    </div>
  );
}
