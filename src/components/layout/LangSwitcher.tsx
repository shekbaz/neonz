"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Globe } from "lucide-react";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export function LangSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-9 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-sm transition-colors hover:bg-white/10">
        <Globe className="h-4 w-4" />
        {LOCALE_LABELS[locale]}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {routing.locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() =>
              router.replace(
                // @ts-expect-error -- pathname est dynamique selon la route courante
                { pathname, params },
                { locale: loc }
              )
            }
          >
            {LOCALE_LABELS[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
