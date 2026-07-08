import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { TestimonialForm } from "@/components/admin/TestimonialForm";

export default async function EditTestimonialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await connectDB();

  const review = await Review.findById(id).lean();
  if (!review) {
    notFound();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">Modifier le témoignage</h1>
      <TestimonialForm
        reviewId={String(review._id)}
        initialData={JSON.parse(
          JSON.stringify({
            authorName: review.authorName ?? "",
            rating: review.rating,
            comment: review.comment,
            status: review.status ?? "approved",
          })
        )}
      />
    </div>
  );
}
