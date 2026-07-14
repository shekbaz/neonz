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

export function OrderStatusUpdater({
  orderId,
  currentStatus,
  depositRequired = 0,
  depositReceived = false,
}: {
  orderId: string;
  currentStatus: string;
  depositRequired?: number;
  depositReceived?: boolean;
}) {
  const t = useTranslations("Admin");
  const tStatus = useTranslations("OrderStatus");
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [deposit, setDeposit] = useState(depositReceived);
  const [loading, setLoading] = useState(false);
  const [depositLoading, setDepositLoading] = useState(false);

  const STATUSES = STATUS_KEYS.map((value) => ({ value, label: tStatus(value) }));
  const blockedByDeposit = status === "in_production" && depositRequired > 0 && !deposit;

  async function handleUpdate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error === "DEPOSIT_REQUIRED" ? t("orderStatusUpdater.depositRequiredWarning") : t("toast.updateFailed")
        );
      }
      toast.success(t("toast.statusUpdated"));
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDepositToggle(checked: boolean) {
    setDeposit(checked);
    setDepositLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: currentStatus, depositReceived: checked }),
      });
      if (!res.ok) throw new Error(t("toast.updateFailed"));
      toast.success(t("orderStatusUpdater.depositUpdated"));
      router.refresh();
    } catch (error) {
      setDeposit(!checked);
      toast.error(error instanceof Error ? error.message : t("toast.genericError"));
    } finally {
      setDepositLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
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
        <Button size="sm" onClick={handleUpdate} disabled={loading || status === currentStatus || blockedByDeposit}>
          {t("orderStatusUpdater.update")}
        </Button>
      </div>

      {depositRequired > 0 && (
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={deposit}
            disabled={depositLoading}
            onChange={(e) => handleDepositToggle(e.target.checked)}
          />
          {t("orderStatusUpdater.depositReceivedLabel", { amount: depositRequired.toLocaleString() })}
        </label>
      )}

      {blockedByDeposit && (
        <p className="max-w-52 text-end text-xs text-destructive">{t("orderStatusUpdater.depositRequiredWarning")}</p>
      )}
    </div>
  );
}
