"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATUS_KEYS = ["pending", "confirmed", "in_production", "shipped", "delivered", "cancelled"] as const;

export function OrderStatusUpdater({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("OrderStatus");
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const STATUSES = STATUS_KEYS.map((value) => ({ value, label: tStatus(value) }));

  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(t("toast.updateFailed"));
      toast.success(t("toast.statusUpdated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select items={STATUSES} value={status} onValueChange={(v) => v && setStatus(v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={handleUpdate} disabled={loading || status === currentStatus}>
        {t("orderStatusUpdater.update")}
      </Button>
    </div>
  );
}
