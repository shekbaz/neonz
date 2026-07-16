"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import type { PricingSettings } from "@/lib/neon/pricing";

/** Longueur/dimensions/support/clignotement d'un exemple fixe, juste pour illustrer la formule en temps réel pendant que l'admin modifie les valeurs. */
const EXAMPLE = { lengthCm: 150, widthCm: 50, heightCm: 30, support: "plexiglass" as const, hasController: true };

export function PricingConfigForm({ initialSettings }: { initialSettings: PricingSettings }) {
  const t = useTranslations("Admin.pricingPage");
  const tToast = useTranslations("Admin.toast");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(initialSettings);

  const exampleTotal = useMemo(() => {
    const tubePrice = Math.round(EXAMPLE.lengthCm * form.pricePerCmOfTube);
    const surfaceCm2 = EXAMPLE.widthCm * EXAMPLE.heightCm;
    const supportSurcharge = Math.round(surfaceCm2 * form.supportPricePerCm2[EXAMPLE.support]);
    const controllerSurcharge = EXAMPLE.hasController ? form.controllerOptionPrice : 0;
    return { tubePrice, surfaceCm2, supportSurcharge, controllerSurcharge, total: tubePrice + supportSurcharge + controllerSurcharge };
  }, [form]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(typeof data.error === "string" ? data.error : tToast("genericError"));
      }
      toast.success(t("saved"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tToast("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid max-w-4xl gap-8 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-6">
        <div>
          <Label htmlFor="pricePerCm">{t("pricePerCm")}</Label>
          <Input
            id="pricePerCm"
            type="number"
            min={0}
            required
            value={form.pricePerCmOfTube}
            onChange={(e) => setForm({ ...form, pricePerCmOfTube: Number(e.target.value) })}
          />
        </div>

        <div>
          <Label htmlFor="depositRate">{t("depositRate")}</Label>
          <Input
            id="depositRate"
            type="number"
            min={0}
            max={100}
            required
            value={Math.round(form.depositRate * 100)}
            onChange={(e) => setForm({ ...form, depositRate: Number(e.target.value) / 100 })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="supportForex">{t("supportForex")}</Label>
            <Input
              id="supportForex"
              type="number"
              min={0}
              required
              value={form.supportPricePerCm2.forex}
              onChange={(e) => setForm({ ...form, supportPricePerCm2: { ...form.supportPricePerCm2, forex: Number(e.target.value) } })}
            />
          </div>
          <div>
            <Label htmlFor="supportPlexiglass">{t("supportPlexiglass")}</Label>
            <Input
              id="supportPlexiglass"
              type="number"
              min={0}
              required
              value={form.supportPricePerCm2.plexiglass}
              onChange={(e) => setForm({ ...form, supportPricePerCm2: { ...form.supportPricePerCm2, plexiglass: Number(e.target.value) } })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="remotePrice">{t("remotePrice")}</Label>
            <Input
              id="remotePrice"
              type="number"
              min={0}
              required
              value={form.remoteOptionPrice}
              onChange={(e) => setForm({ ...form, remoteOptionPrice: Number(e.target.value) })}
            />
          </div>
          <div>
            <Label htmlFor="controllerPrice">{t("controllerPrice")}</Label>
            <Input
              id="controllerPrice"
              type="number"
              min={0}
              required
              value={form.controllerOptionPrice}
              onChange={(e) => setForm({ ...form, controllerOptionPrice: Number(e.target.value) })}
            />
          </div>
        </div>

        <Button type="submit" disabled={loading}>
          {t("save")}
        </Button>
      </div>

      <div className="h-fit rounded-xl bg-card p-5 ring-1 ring-foreground/10">
        <h3 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t("exampleTitle")}</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          {t("exampleDescription", { length: EXAMPLE.lengthCm, width: EXAMPLE.widthCm, height: EXAMPLE.heightCm, support: t("supportPlexiglass") })}
        </p>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("exampleTube", { length: EXAMPLE.lengthCm, price: form.pricePerCmOfTube })}</dt>
            <dd className="font-medium">{exampleTotal.tubePrice.toLocaleString()} {form.currency}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">
              {t("exampleSupport", { surface: exampleTotal.surfaceCm2, price: form.supportPricePerCm2[EXAMPLE.support] })}
            </dt>
            <dd className="font-medium">+{exampleTotal.supportSurcharge.toLocaleString()} {form.currency}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">{t("exampleController")}</dt>
            <dd className="font-medium">+{exampleTotal.controllerSurcharge.toLocaleString()} {form.currency}</dd>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base">
            <dt className="font-semibold">{t("exampleTotal")}</dt>
            <dd className="font-bold text-primary">{exampleTotal.total.toLocaleString()} {form.currency}</dd>
          </div>
        </dl>
      </div>
    </form>
  );
}
