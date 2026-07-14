"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { ColorPicker } from "@/components/admin/ColorPicker";
import { useRouter } from "@/i18n/navigation";
import { describeApiError } from "@/lib/formErrorMessage";
import { toast } from "sonner";

interface CategoryOption {
  _id: string;
  slug: string;
  translations: { fr: { name: string } };
}

interface ColorOption {
  _id: string;
  name: string;
  hex: string;
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
  colors,
  productId,
  initialData,
}: {
  categories: CategoryOption[];
  colors: ColorOption[];
  productId?: string;
  initialData?: ProductInitialData;
}) {
  const t = useTranslations("Admin.form");
  const tToast = useTranslations("Admin.toast");
  const router = useRouter();
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    slug: initialData?.slug ?? "",
    category: initialData?.category ?? categories[0]?._id ?? "",
    images: initialData?.images ?? [],
    colors: initialData?.colors ?? [],
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
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(describeApiError(data.error, locale));
      }

      toast.success(isEditing ? tToast("productModified") : tToast("productCreated"));
      router.push("/admin/produits");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : describeApiError(undefined, locale));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
      <div>
        <Label htmlFor="slug">{t("slug")}</Label>
        <Input
          id="slug"
          required
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
        />
      </div>

      <Tabs defaultValue="fr">
        <TabsList>
          <TabsTrigger value="fr">{t("tabFr")}</TabsTrigger>
          <TabsTrigger value="en">{t("tabEn")}</TabsTrigger>
          <TabsTrigger value="ar">{t("tabAr")}</TabsTrigger>
        </TabsList>
        {(["fr", "en", "ar"] as const).map((locale) => (
          <TabsContent key={locale} value={locale} className="space-y-4">
            <div>
              <Label>{t("name")}</Label>
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
              <Label>{t("description")}</Label>
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
        <Label>{t("category")}</Label>
        <Select
          items={categories.map((cat) => ({ value: cat._id, label: cat.translations.fr.name }))}
          value={form.category}
          onValueChange={(v) => v && setForm({ ...form, category: v })}
        >
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
        <Label>{t("images")}</Label>
        <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} />
      </div>

      <div>
        <Label>{t("colorsLabel")}</Label>
        {colors.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("noColorsInPalette")}
          </p>
        ) : (
          <ColorPicker
            colors={colors}
            selected={form.colors}
            onChange={(selected) => setForm({ ...form, colors: selected })}
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basePrice">{t("price")}</Label>
          <Input
            id="basePrice"
            type="number"
            required
            value={form.basePrice}
            onChange={(e) => setForm({ ...form, basePrice: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="stock">{t("stock")}</Label>
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
          <Label htmlFor="width">{t("width")}</Label>
          <Input
            id="width"
            type="number"
            value={form.dimensions.width}
            onChange={(e) => setForm({ ...form, dimensions: { ...form.dimensions, width: Number(e.target.value) } })}
          />
        </div>
        <div>
          <Label htmlFor="height">{t("height")}</Label>
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
          {t("active")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isFeatured}
            onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })}
          />
          {t("featured")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.isCustomizable}
            onChange={(e) => setForm({ ...form, isCustomizable: e.target.checked })}
          />
          {t("customizable")}
        </label>
      </div>

      <Button type="submit" disabled={loading}>
        {isEditing ? t("saveChanges") : t("createProduct")}
      </Button>
    </form>
  );
}
