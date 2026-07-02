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

const emptyTranslation = { name: "", description: "" };

export function ProductForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    category: categories[0]?._id ?? "",
    images: "",
    basePrice: 0,
    stock: 0,
    isFeatured: false,
    isActive: true,
    translations: { fr: { ...emptyTranslation }, en: { ...emptyTranslation }, ar: { ...emptyTranslation } },
    dimensions: { width: 30, height: 30, unit: "cm" as const },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          images: form.images.split(",").map((s) => s.trim()).filter(Boolean),
          colors: [],
          isCustomizable: false,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(JSON.stringify(data.error) ?? "Échec de la création.");
      }

      toast.success("Produit créé.");
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

      <Button type="submit" disabled={loading}>
        Créer le produit
      </Button>
    </form>
  );
}
