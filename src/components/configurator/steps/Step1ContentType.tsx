"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { UploadCloud, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { NEON_FONTS, type NeonFontId } from "@/types/neon";
import { toast } from "sonner";

export function Step1ContentType() {
  const t = useTranslations("Configurator.step1");
  const {
    sourceType,
    setSourceType,
    sourceImageUrl,
    setSourceImageUrl,
    sourceText,
    setSourceText,
    fontId,
    setFontId,
  } = useConfiguratorStore();

  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Échec de l'upload.");
      }
      const data = await res.json();
      setSourceImageUrl(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de l'upload.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <Tabs
      value={sourceType ?? "image"}
      onValueChange={(v) => setSourceType(v as "image" | "text")}
    >
      <TabsList>
        <TabsTrigger value="image">{t("uploadTab")}</TabsTrigger>
        <TabsTrigger value="text">{t("textTab")}</TabsTrigger>
      </TabsList>

      <TabsContent value="image" className="mt-6">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-card/50 p-12 text-center transition-colors hover:border-primary/60 hover:bg-primary/[0.04]"
        >
          {uploading ? (
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          ) : (
            <UploadCloud className="h-10 w-10 text-muted-foreground" />
          )}
          <p className="text-sm text-muted-foreground">{t("uploadHint")}</p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleFileChange}
        />

        {sourceImageUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sourceImageUrl} alt="Aperçu" className="max-h-64 w-full object-contain bg-muted" />
          </div>
        )}
      </TabsContent>

      <TabsContent value="text" className="mt-6 space-y-4">
        <div>
          <Label htmlFor="neon-text">{t("textLabel")}</Label>
          <Textarea
            id="neon-text"
            placeholder={t("textPlaceholder")}
            maxLength={60}
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
          />
        </div>

        <div>
          <Label htmlFor="neon-font">{t("fontLabel")}</Label>
          <Select
            items={NEON_FONTS.map((font) => ({ value: font.id, label: font.label }))}
            value={fontId}
            onValueChange={(v) => setFontId(v as NeonFontId)}
          >
            <SelectTrigger id="neon-font" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {NEON_FONTS.map((font) => (
                <SelectItem key={font.id} value={font.id}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </TabsContent>
    </Tabs>
  );
}
