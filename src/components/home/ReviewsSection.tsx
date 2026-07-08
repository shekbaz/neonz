import { Star } from "lucide-react";

interface ReviewDoc {
  _id: string;
  rating: number;
  comment: string;
  authorName?: string;
  user?: { name: string };
}

export function ReviewsSection({ reviews }: { reviews: ReviewDoc[] }) {
  if (reviews.length === 0) {
    return <p className="text-muted-foreground">Aucun avis pour le moment.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review) => (
        <figure key={review._id} className="flex flex-col rounded-xl bg-card p-6 ring-1 ring-foreground/10">
          <div className="mb-3 flex gap-0.5 text-primary" aria-label={`${review.rating}/5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5" fill={i < review.rating ? "currentColor" : "none"} strokeWidth={i < review.rating ? 0 : 1.5} />
            ))}
          </div>
          <blockquote className="flex-1 text-sm leading-relaxed text-muted-foreground">{review.comment}</blockquote>
          <figcaption className="mt-4 flex items-center gap-2 text-sm font-medium">
            <span className="tube-dash w-3!" aria-hidden />
            {review.authorName ?? review.user?.name ?? "Client NEONZ"}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
