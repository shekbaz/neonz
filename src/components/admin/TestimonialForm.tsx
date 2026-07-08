"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

const RATING_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: `${n}/5` }));
const STATUS_OPTIONS = [
  { value: "approved", label: "Publié" },
  { value: "pending", label: "En attente" },
  { value: "rejected", label: "Rejeté" },
];

interface TestimonialInitialData {
  authorName: string;
  rating: number;
  comment: string;
  status: "pending" | "approved" | "rejected";
}

export function TestimonialForm({
  reviewId,
  initialData,
}: {
  reviewId?: string;
  initialData?: TestimonialInitialData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    authorName: initialData?.authorName ?? "",
    rating: initialData?.rating ?? 5,
    comment: initialData?.comment ?? "",
    status: initialData?.status ?? "approved",
  });

  const isEditing = Boolean(reviewId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(isEditing ? `/api/admin/reviews/${reviewId}` : "/api/admin/reviews", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : `Échec de ${isEditing ? "la modification" : "la création"}.`);
      }

      toast.success(isEditing ? "Témoignage modifié." : "Témoignage créé.");
      router.push("/admin/avis");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div>
        <Label htmlFor="authorName">Nom du client</Label>
        <Input
          id="authorName"
          required
          value={form.authorName}
          onChange={(e) => setForm({ ...form, authorName: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="comment">Commentaire</Label>
        <Textarea
          id="comment"
          required
          rows={4}
          value={form.comment}
          onChange={(e) => setForm({ ...form, comment: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Note</Label>
          <Select
            items={RATING_OPTIONS}
            value={String(form.rating)}
            onValueChange={(v) => v && setForm({ ...form, rating: Number(v) })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RATING_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Statut</Label>
          <Select
            items={STATUS_OPTIONS}
            value={form.status}
            onValueChange={(v) => v && setForm({ ...form, status: v as typeof form.status })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {isEditing ? "Enregistrer les modifications" : "Créer le témoignage"}
      </Button>
    </form>
  );
}
