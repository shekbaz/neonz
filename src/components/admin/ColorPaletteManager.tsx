"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

interface ColorItem {
  _id: string;
  name: string;
  hex: string;
}

export function ColorPaletteManager({ initialColors }: { initialColors: ColorItem[] }) {
  const t = useTranslations("Admin");
  const router = useRouter();
  const [colors, setColors] = useState(initialColors);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#FF2FC0");
  const [loading, setLoading] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, hex }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t("toast.addFailed"));
      }
      setColors([...colors, data]);
      setName("");
      toast.success(t("toast.colorAdded"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(t("confirm.deleteColor"))) return;
    try {
      const res = await fetch(`/api/colors/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(t("toast.deleteFailed"));
      setColors(colors.filter((c) => c._id !== id));
      toast.success(t("toast.colorDeleted"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
    }
  }

  return (
    <div className="space-y-8">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-4">
        <div>
          <Label htmlFor="color-name">{t("form.name")}</Label>
          <Input id="color-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("colorPalette.namePlaceholder")} />
        </div>
        <div>
          <Label htmlFor="color-hex">{t("colorPalette.colorField")}</Label>
          <div className="flex items-center gap-2">
            <input
              id="color-hex"
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="h-9 w-12 cursor-pointer rounded border border-border bg-transparent"
            />
            <Input
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              className="w-28 uppercase"
              maxLength={7}
            />
          </div>
        </div>
        <Button type="submit" disabled={loading}>
          {t("colorPalette.addToPalette")}
        </Button>
      </form>

      <div className="flex flex-wrap gap-4">
        {colors.map((color) => (
          <div key={color._id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
            <span className="h-6 w-6 shrink-0 rounded-full border border-border" style={{ backgroundColor: color.hex }} />
            <div className="text-sm">
              <p className="font-medium">{color.name}</p>
              <p className="text-xs text-muted-foreground">{color.hex}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(color._id)}>
              <Trash2 className="h-4 w-4 text-red-400" />
            </Button>
          </div>
        ))}
        {colors.length === 0 && <p className="text-sm text-muted-foreground">{t("colorPalette.empty")}</p>}
      </div>
    </div>
  );
}
