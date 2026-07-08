"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

interface CategoryInitialData {
  slug: string;
  image?: string;
  order: number;
  translations: {
    fr: { name: string };
    en: { name: string };
    ar: { name: string };
  };
}

export function CategoryForm({
  categoryId,
  initialData,
}: {
  categoryId?: string;
  initialData?: CategoryInitialData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    order: initialData?.order ?? 0,
    images: initialData?.image ? [initialData.image] : ([] as string[]),
    translations: initialData?.translations ?? {
      fr: { name: "" },
      en: { name: "" },
      ar: { name: "" },
    },
  });

  const isEditing = Boolean(categoryId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(isEditing ? `/api/categories/${categoryId}` : "/api/categories", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          order: form.order,
          translations: form.translations,
          image: form.images[0] ?? "",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(typeof data.error === "string" ? data.error : `Échec de ${isEditing ? "la modification" : "la création"}.`);
      }

      toast.success(isEditing ? "Catégorie modifiée." : "Catégorie créée.");
      router.push("/admin/categories");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <div>
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      </div>

      <Tabs defaultValue="fr">
        <TabsList>
          <TabsTrigger value="fr">Français</TabsTrigger>
          <TabsTrigger value="en">English</TabsTrigger>
          <TabsTrigger value="ar">العربية</TabsTrigger>
        </TabsList>
        {(["fr", "en", "ar"] as const).map((locale) => (
          <TabsContent key={locale} value={locale}>
            <Label>Nom</Label>
            <Input
              required
              value={form.translations[locale].name}
              onChange={(e) =>
                setForm({
                  ...form,
                  translations: { ...form.translations, [locale]: { name: e.target.value } },
                })
              }
            />
          </TabsContent>
        ))}
      </Tabs>

      <div>
        <Label>Image</Label>
        <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} multiple={false} />
      </div>

      <div>
        <Label htmlFor="order">Ordre d&apos;affichage</Label>
        <Input
          id="order"
          type="number"
          value={form.order}
          onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {isEditing ? "Enregistrer les modifications" : "Créer la catégorie"}
      </Button>
    </form>
  );
}
