"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function ContactPage() {
  const t = useTranslations("Contact");
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
    toast.success(t("toastSuccess"));
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <h1 className="mb-8 font-display text-4xl font-bold uppercase tracking-[0.03em] sm:text-5xl">{t("title")}</h1>

      {sent ? (
        <p className="text-muted-foreground">{t("sentText")}</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">{t("nameLabel")}</Label>
            <Input id="name" required />
          </div>
          <div>
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" type="email" required />
          </div>
          <div>
            <Label htmlFor="message">{t("messageLabel")}</Label>
            <Textarea id="message" rows={5} required />
          </div>
          <Button type="submit" className="w-full">{t("submit")}</Button>
        </form>
      )}
    </div>
  );
}
