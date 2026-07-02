"use client";

import { LayoutDashboard, Package, ShoppingBag, Users, Star, BarChart3 } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/produits", label: "Produits", icon: Package },
  { href: "/admin/commandes", label: "Commandes", icon: ShoppingBag },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/avis", label: "Avis", icon: Star },
  { href: "/admin/statistiques", label: "Statistiques", icon: BarChart3 },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-e border-border bg-muted/50 p-4">
      <nav className="flex flex-col gap-1">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                active && "bg-primary/20 text-primary"
              )}
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
