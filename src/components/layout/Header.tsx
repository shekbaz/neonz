"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Menu, User as UserIcon } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LangSwitcher } from "@/components/layout/LangSwitcher";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("home") },
    { href: "/catalogue", label: t("catalog") },
    { href: "/personnaliser", label: t("customize") },
    { href: "/contact", label: t("contact") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" dir="ltr" className="brand-mark flex items-baseline gap-0.5 font-display text-[1.75rem] font-bold leading-none tracking-[0.02em]">
          NEON<span className="tube">Z</span>ART
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 text-[0.8rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href &&
                  "text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary dark:after:shadow-[0_0_8px_var(--color-primary)]"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <LangSwitcher />
          <ThemeToggle />

          {session?.user && (
            <div className="hidden items-center gap-1 md:flex">
              {session.user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm">{t("admin")}</Button>
                </Link>
              )}
              <Link href="/compte">
                <Button variant="ghost" size="icon"><UserIcon className="h-4 w-4" /></Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>{t("logout")}</Button>
            </div>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted md:hidden"
              aria-label={t("menuLabel")}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <nav className="mt-10 flex flex-col gap-5 px-4">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "font-display text-2xl font-semibold uppercase tracking-[0.06em]",
                      pathname === link.href && "tube"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                {session?.user && (
                  <>
                    <div className="my-2 h-px bg-border" />
                    {session.user.role === "admin" && (
                      <Link href="/admin" onClick={() => setOpen(false)}>{t("admin")}</Link>
                    )}
                    <Link href="/compte" onClick={() => setOpen(false)}>{t("account")}</Link>
                    <button onClick={() => signOut()} className="text-start">{t("logout")}</button>
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
