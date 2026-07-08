"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";

interface CategoryOption {
  _id: string;
  slug: string;
  translations: { fr: { name: string } };
}

interface ProductInitialData {
  slug: string;
  category: string;
  images: string[];
  colors: string[];
  basePrice: number;
  stock: number;
  isCustomizable: boolean;
  isFeatured: boolean;
  isActive: boolean;
  translations: {
    fr: { name: string; description: string };
    en: { name: string; description: string };
    ar: { name: string; description: string };
  };
  dimensions: { width: number; height: number; unit: "cm" };
}

const emptyTranslation = { name: "", description: "" };

export function ProductForm({
  categories,
  productId,
  initialData,
}: {
  categories: CategoryOption[];
  productId?: string;
  initialData?: ProductInitialData;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    category: initialData?.category ?? categories[0]?._id ?? "",
    images: initialData?.images.join(", ") ?? "",
    colors: initialData?.colors.join(", ") ?? "",
    basePrice: initialData?.basePrice ?? 0,
    stock: initialData?.stock ?? 0,
    isCustomizable: initialData?.isCustomizable ?? false,
    isFeatured: initialData?.isFeatured ?? false,
    isActive: initialData?.isActive ?? true,
    translations: initialData?.translations ?? {
      fr: { ...emptyTranslation },
      en: { ...emptyTranslation },
      ar: { ...emptyTranslation },
    },
    dimensions: initialData?.dimensions ?? { width: 30, height: 30, unit: "cm" as const },
  });

  const isEditing = Boolean(productId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(isEditing ? `/api/products/${productId}` : "/api/products", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
          colors: form.colors.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data.error) ?? `Échec de ${isEditing ? "la modification" : "la création"}.`);
      }

      toast.success(isEditing ? "Produit modifié." : "Produit créé.");
      router.push("/admin/produits");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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
          <TabsContent key={locale} value={locale} className="space-y-4">
            <div>
              <Label>Nom</Label>
              <Input
                required
                value={form.translations[locale].name}
                onChange={(e) =>
                  setForm({
                    ...form,
                    translations: { ...form.translations, [locale]: { ...form.translations[locale], name: e.target.value } },
                  })
                }
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                required
                rows={4}
                value={form.translations[locale].description}
                onChange={(e) =>
                  setForm({
                    ...form,
                    translations: {
                      ...form.translations,
                      [locale]: { ...form.translations[locale], description: e.target.value },
                    },
                  })
                }
              />
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <div>
        <Label>Catégorie</Label>
        <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat._id} value={cat._id}>
                {cat.translations.fr.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="images">Images (URLs séparées par des virgules)</Label>
        <Input id="images" value={form.images} onChange={(e) => setForm({ ...form, images: e.target.value })} />
      </div>

      <div>
        <Label htmlFor="colors">Couleurs (codes hex séparés par des virgules)</Label>
        <Input id="colors" value={form.colors} onChange={(e) => setForm({ ...form, colors: e.target.value })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice">Prix (DZD)</Label>
          <Input
            id="basePrice"
            type="number"
            required
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="stock">Stock</Label>
          <Input
            id="stock"
            type="number"
            required
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="width">Largeur (cm)</Label>
          <Input
            id="width"
            type="number"
            value={form.dimensions.width}
            onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, width: Number(e.target.value) } })}
          />
        </div>
        <div>
          <Label htmlFor="height">Hauteur (cm)</Label>
          <Input
            id="height"
            type="number"
            value={form.dimensions.height}
            onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, height: Number(e.target.value) } })}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          Actif (visible sur le site)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
          />
          Mis en avant
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCustomizable}
            onChange={(e) => setForm({ ...form, isCustomizable: e.target.checked })}
          />
          Personnalisable
        </label>
      </div>

      <Button type="submit" disabled={loading}>
        {isEditing ? "Enregistrer les modifications" : "Créer le produit"}
      </Button>
    </form>
  );
}
