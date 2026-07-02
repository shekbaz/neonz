"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

export function ProductDeleteButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm("Supprimer ce produit ?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Échec de la suppression.");
      toast.success("Produit supprimé.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleDelete} disabled={loading}>
      <Trash2 className="h-4 w-4 text-red-400" />
    </Button>
  );
}
