"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

export function ReviewModerationRow({
  reviewId,
  comment,
  rating,
  authorName,
}: {
  reviewId: string;
  comment: string;
  rating: number;
  authorName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(status: "approved" | "rejected") {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Échec de la modération.");
      toast.success(status === "approved" ? "Avis approuvé." : "Avis rejeté.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/50 p-4">
      <div>
        <p className="text-sm font-semibold">{authorName} — {rating}/5</p>
        <p className="mt-1 text-sm text-muted-foreground">{comment}</p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="icon" variant="ghost" disabled={loading} onClick={() => updateStatus("approved")}>
          <Check className="h-4 w-4 text-emerald-400" />
        </Button>
        <Button size="icon" variant="ghost" disabled={loading} onClick={() => updateStatus("rejected")}>
          <X className="h-4 w-4 text-red-400" />
        </Button>
      </div>
    </div>
  );
}
