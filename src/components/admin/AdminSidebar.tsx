"use client";

import { LayoutDashboard, Package, Tag, Palette, ShoppingBag, Users, Star, BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const t = useTranslations("Admin");
  const pathname = usePathname();

  const LINKS = [
    { href: "/admin", label: t("dashboard"), icon: LayoutDashboard },
    { href: "/admin/produits", label: t("products"), icon: Package },
    { href: "/admin/categories", label: t("categories"), icon: Tag },
    { href: "/admin/couleurs", label: t("colors"), icon: Palette },
    { href: "/admin/commandes", label: t("orders"), icon: ShoppingBag },
    { href: "/admin/clients", label: t("customers"), icon: Users },
    { href: "/admin/avis", label: t("reviews"), icon: Star },
    { href: "/admin/statistiques", label: t("stats"), icon: BarChart3 },
  ];

  return (
    <aside className="w-60 shrink-0 border-e border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
      <p className="mb-4 flex items-center gap-2 px-3 pt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <span className="tube-dash w-3!" aria-hidden />
        {t("sidebarEyebrow")}
      </p>
      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
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
    </aside>
  );
}
