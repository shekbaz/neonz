"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { UploadCloud, Loader2, AlertCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { NeonCanvasPreview } from "@/components/configurator/NeonCanvasPreview";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { NEON_FONTS, type NeonFontId } from "@/types/neon";
import { toast } from "sonner";

function sliderValue(v: number | readonly number[]): number {
  return Array.isArray(v) ? v[0] : (v as number);
}

export function Step1Content() {
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
    paths,
    workspaceWidthPx,
    workspaceHeightPx,
    resolutionStatus,
    resolutionFailureReason,
    traceSettings,
    setTraceSettings,
    resetTraceSettings,
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

  const hasContent = sourceType === "image" ? !!sourceImageUrl : sourceText.trim().length > 0;
  const showPreview = hasContent && (resolutionStatus === "resolving" || paths.length > 0);

  return (
    <div className="space-y-6">
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
          <p className="mt-2 text-xs text-muted-foreground">{t("contrastHint")}</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={handleFileChange}
          />

          {sourceImageUrl && (
            <Accordion className="mt-4">
              <AccordionItem value="advanced-trace">
                <AccordionTrigger>{t("advancedTraceToggle")}</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label>{t("thresholdLabel")}</Label>
                        <span className="text-xs text-muted-foreground">{traceSettings.threshold}</span>
                      </div>
                      <Slider
                        min={0}
                        max={255}
                        step={1}
                        value={[traceSettings.threshold]}
                        onValueChange={(v) => setTraceSettings({ threshold: sliderValue(v) })}
                      />
                      <p className="mt-1 text-xs text-muted-foreground">{t("thresholdHint")}</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="trace-invert">{t("invertLabel")}</Label>
                      <Switch
                        id="trace-invert"
                        checked={traceSettings.invert}
                        onCheckedChange={(v) => setTraceSettings({ invert: v })}
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label>{t("blurLabel")}</Label>
                        <span className="text-xs text-muted-foreground">{traceSettings.blurSigma}</span>
                      </div>
                      <Slider
                        min={0}
                        max={10}
                        step={1}
                        value={[traceSettings.blurSigma]}
                        onValueChange={(v) => setTraceSettings({ blurSigma: sliderValue(v) })}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={resetTraceSettings}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {t("resetTraceSettings")}
                    </button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-6 space-y-4">
          <div>
            <Label htmlFor="neon-text">{t("textLabel")}</Label>
            <Input
              id="neon-text"
              placeholder={t("textPlaceholder")}
              maxLength={60}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value.replace(/[\r\n]+/g, " "))}
            />
            <p className="mt-1 text-xs text-muted-foreground">{t("singleLineHint")}</p>
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

      {showPreview && (
        <div className="relative">
          <NeonCanvasPreview
            paths={paths}
            workspaceWidthPx={workspaceWidthPx}
            workspaceHeightPx={workspaceHeightPx}
            className="h-64"
          />
          {resolutionStatus === "resolving" && (
            <div className="absolute inset-0 flex items-center justify-center gap-3 rounded-xl bg-background/60 text-sm text-muted-foreground backdrop-blur-[2px]">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("resolving")}
            </div>
          )}
        </div>
      )}

      {resolutionStatus === "unresolved" && resolutionFailureReason && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {resolutionFailureReason === "traceTooDenseText" || resolutionFailureReason === "traceTooDenseImage"
              ? t(resolutionFailureReason)
              : t("genericError")}
          </p>
        </div>
      )}
    </div>
  );
}
