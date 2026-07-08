"use client";

import { LayoutDashboard, Package, Tag, Palette, ShoppingBag, Users, Star, BarChart3 } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/categories", label: "Catégories", icon: Tag },
  { href: "/admin/couleurs", label: "Couleurs", icon: Palette },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-60 shrink-0 border-e border-sidebar-border bg-sidebar p-4 text-sidebar-foreground">
      <p className="mb-4 flex items-center gap-2 px-3 pt-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        <span className="tube-dash w-3!" aria-hidden />
        Atelier
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
