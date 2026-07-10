import type { ApiIssue } from "@/lib/validators/zodErrorResponse";

type Locale = "fr" | "en" | "ar";

const LOCALE_NAMES: Record<Locale, Record<Locale, string>> = {
  fr: { fr: "Français", en: "Anglais", ar: "Arabe" },
  en: { fr: "French", en: "English", ar: "Arabic" },
  ar: { fr: "الفرنسية", en: "الإنجليزية", ar: "العربية" },
};

const FIELD_LABELS: Record<Locale, Record<string, string>> = {
  fr: {
    slug: "Le slug",
    category: "La catégorie",
    images: "Les images",
    basePrice: "Le prix",
    discountPrice: "Le prix promo",
    "dimensions.width": "La largeur",
    "dimensions.height": "La hauteur",
    stock: "Le stock",
    order: "L'ordre d'affichage",
    name: "Le nom",
    description: "La description",
  },
  en: {
    slug: "The slug",
    category: "The category",
    images: "The images",
    basePrice: "The price",
    discountPrice: "The discount price",
    "dimensions.width": "The width",
    "dimensions.height": "The height",
    stock: "The stock",
    order: "The display order",
    name: "The name",
    description: "The description",
  },
  ar: {
    slug: "الرابط المختصر",
    category: "الفئة",
    images: "الصور",
    basePrice: "السعر",
    discountPrice: "سعر التخفيض",
    "dimensions.width": "العرض",
    "dimensions.height": "الارتفاع",
    stock: "المخزون",
    order: "ترتيب العرض",
    name: "الاسم",
    description: "الوصف",
  },
};

const INTRO: Record<Locale, string> = {
  fr: "Veuillez corriger les champs suivants :",
  en: "Please fix the following fields:",
  ar: "يرجى تصحيح الحقول التالية:",
};

const GENERIC_FALLBACK: Record<Locale, string> = {
  fr: "Une erreur est survenue.",
  en: "An error occurred.",
  ar: "حدث خطأ ما.",
};

function resolveLocale(locale: string): Locale {
  return locale === "en" || locale === "ar" ? locale : "fr";
}

function labelForPath(path: string, locale: Locale): string {
  // "translations.fr.description" -> "La description (Français)"
  const translationMatch = path.match(/^translations\.(fr|en|ar)\.(name|description)$/);
  if (translationMatch) {
    const [, fieldLocale, field] = translationMatch;
    const base = FIELD_LABELS[locale][field] ?? field;
    return `${base} (${LOCALE_NAMES[locale][fieldLocale as Locale]})`;
  }
  return FIELD_LABELS[locale][path] ?? path;
}

function messageForIssue(issue: ApiIssue, locale: Locale): string {
  const label = labelForPath(issue.path, locale);

  if (issue.code === "too_small" && issue.minimum !== undefined) {
    if (issue.path === "basePrice" || issue.path === "discountPrice" || issue.path.startsWith("dimensions")) {
      return {
        fr: `${label} doit être supérieur à ${issue.minimum}.`,
        en: `${label} must be greater than ${issue.minimum}.`,
        ar: `يجب أن يكون ${label} أكبر من ${issue.minimum}.`,
      }[locale];
    }
    return {
      fr: `${label} doit contenir au moins ${issue.minimum} caractère${issue.minimum > 1 ? "s" : ""}.`,
      en: `${label} must be at least ${issue.minimum} character${issue.minimum > 1 ? "s" : ""} long.`,
      ar: `يجب أن يحتوي ${label} على ${issue.minimum} حرفًا على الأقل.`,
    }[locale];
  }

  if (issue.code === "too_big" && issue.maximum !== undefined) {
    return {
      fr: `${label} ne doit pas dépasser ${issue.maximum} caractères.`,
      en: `${label} must not exceed ${issue.maximum} characters.`,
      ar: `يجب ألا يتجاوز ${label} ${issue.maximum} حرفًا.`,
    }[locale];
  }

  if (issue.code === "invalid_type") {
    return {
      fr: `${label} est requis.`,
      en: `${label} is required.`,
      ar: `${label} مطلوب.`,
    }[locale];
  }

  // Pour les codes restants (regex, custom, etc.), le message du serveur
  // est déjà écrit à la main en français dans le schéma — on le garde tel quel.
  return issue.message;
}

export function describeApiError(error: unknown, locale: string): string {
  const loc = resolveLocale(locale);

  if (typeof error === "string") return error;

  if (Array.isArray(error) && error.every((e) => e && typeof e === "object" && "path" in e && "message" in e)) {
    const issues = error as ApiIssue[];
    if (issues.length === 0) return GENERIC_FALLBACK[loc];
    const lines = issues.map((issue) => messageForIssue(issue, loc));
    return `${INTRO[loc]} ${lines.join(" · ")}`;
  }

  return GENERIC_FALLBACK[loc];
}
