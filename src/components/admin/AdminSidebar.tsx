"use client";

import { useState } from "react";
import { LayoutDashboard, Package, Tag, Palette, ShoppingBag, Users, Star, BarChart3, Menu, Banknote } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from "@/components/ui/sheet";

function useAdminLinks() {
  const t = useTranslations("Admin");
  return [
    { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/produits", label: t("products"), icon: Package },
    { href: "/admin/categories", label: t("categories"), icon: Tag },
    { href: "/admin/couleurs", label: t("colors"), icon: Palette },
    { href: "/admin/tarifs", label: t("pricing"), icon: Banknote },
    { href: "/admin/commandes", label: t("orders"), icon: ShoppingBag },
    { href: "/admin/clients", label: t("customers"), icon: Users },
    { href: "/admin/avis", label: t("reviews"), icon: Star },
    { href: "/admin/statistiques", label: t("stats"), icon: BarChart3 },
  ] as const;
}

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const links = useAdminLinks();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const Icon = link.icon;
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-2.5 rounded-md border-s-2 border-transparent px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "border-primary bg-primary/10 font-medium text-primary"
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="h-4 w-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Barre mobile : bouton menu ouvrant la navigation en tiroir */}
      <div className="flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-4 py-3 text-sidebar-foreground md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border hover:bg-muted"
            aria-label={t("sidebarEyebrow")}
          >
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-72 max-w-[80vw] bg-sidebar p-4 text-sidebar-foreground">
            <SheetHeader className="p-0 pb-2">
              <SheetTitle className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                <span className="tube-dash w-3!" aria-hidden />
                {t("sidebarEyebrow")}
              </SheetTitle>
            </SheetHeader>
            <AdminNavLinks onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">{t("sidebarEyebrow")}</p>
      </div>

      {/* Barre laterale fixe (bureau) */}
      <aside className="hidden w-60 shrink-0 border-e border-sidebar-border bg-sidebar p-4 text-sidebar-foreground md:block">
        <p className="mb-4 flex items-center gap-2 px-3 pt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <span className="tube-dash w-3!" aria-hidden />
          {t("sidebarEyebrow")}
        </p>
        <AdminNavLinks />
      </aside>
    </>
  );
}
