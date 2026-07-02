"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingCart, User as UserIcon, Zap } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LangSwitcher } from "@/components/layout/LangSwitcher";
import { useCartStore } from "@/store/cartStore";
import { cn } from "@/lib/utils";

export function Header() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const { data: session } = useSession();
  const cartCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/", label: t("home") },
    { href: "/catalogue", label: t("catalog") },
    { href: "/personnaliser", label: t("customize") },
    { href: "/contact", label: t("contact") },
    { href: "/faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" fill="currentColor" />
          </span>
          <span className="text-lg font-bold tracking-tight">NEONZ</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname === link.href && "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LangSwitcher />
          <ThemeToggle />

          <Link href="/panier" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-muted/50 hover:bg-muted">
            <ShoppingCart className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {cartCount}
              </span>
            )}
          </Link>

          {session?.user ? (
            <div className="hidden items-center gap-2 md:flex">
              {session.user.role === "admin" && (
                <Link href="/admin">
                  <Button variant="secondary" size="sm">{t("admin")}</Button>
                </Link>
              )}
              <Link href="/compte">
                <Button variant="ghost" size="icon"><UserIcon className="h-4 w-4" /></Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => signOut()}>{t("logout")}</Button>
            </div>
          ) : (
            <Link href="/connexion" className="hidden md:block">
              <Button size="sm">{t("login")}</Button>
            </Link>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-muted md:hidden"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <nav className="mt-10 flex flex-col gap-4 px-4">
                {links.map((link) => (
                  <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-base font-medium">
                    {link.label}
                  </Link>
                ))}
                <div className="my-2 h-px bg-border" />
                {session?.user ? (
                  <>
                    {session.user.role === "admin" && (
                      <Link href="/admin" onClick={() => setOpen(false)}>{t("admin")}</Link>
                    )}
                    <Link href="/compte" onClick={() => setOpen(false)}>{t("account")}</Link>
                    <button onClick={() => signOut()} className="text-start">{t("logout")}</button>
                  </>
                ) : (
                  <Link href="/connexion" onClick={() => setOpen(false)}>{t("login")}</Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
