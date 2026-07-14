"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslations } from "next-intl";

interface RevenuePoint {
  period: string;
  revenue: number;
  orders: number;
}

export function RevenueChart({ data }: { data: RevenuePoint[] }) {
  const t = useTranslations("Admin.revenueChart");

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("notEnoughData")}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis dataKey="period" stroke="currentColor" fontSize={12} />
        <YAxis stroke="currentColor" fontSize={12} />
        <Tooltip
          contentStyle={{ background: "#19191f", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
        />
        <Line type="monotone" dataKey="revenue" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
