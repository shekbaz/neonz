"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

export function CategoryDeleteButton({ categoryId }: { categoryId: string }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t("confirm.deleteCategory"))) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("toast.deleteFailed"));
      toast.success(t("toast.categoryDeleted"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
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
