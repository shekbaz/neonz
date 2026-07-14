"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useRouter } from "@/i18n/navigation";
import { describeApiError } from "@/lib/formErrorMessage";
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
  const t = useTranslations("Admin.form");
  const tToast = useTranslations("Admin.toast");
  const router = useRouter();
  const locale = useLocale();
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
        const data = await res.json().catch(() => ({}));
        throw new Error(describeApiError(data.error, locale));
      }

      toast.success(isEditing ? tToast("categoryModified") : tToast("categoryCreated"));
      router.push("/admin/categories");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tToast("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
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
          <TabsContent key={locale} value={locale}>
            <Label>{t("name")}</Label>
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
        <Label>{t("image")}</Label>
        <ImageUploader images={form.images} onChange={(images) => setForm({ ...form, images })} multiple={false} />
      </div>

      <div>
        <Label htmlFor="order">{t("order")}</Label>
        <Input
          id="order"
          type="number"
          value={form.order}
          onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {isEditing ? t("saveChanges") : t("createCategory")}
      </Button>
    </form>
  );
}
