import { getTranslations } from "next-intl/server";
import { connectDB } from "@/lib/db";
import { Color } from "@/models/Color";
import { ColorPaletteManager } from "@/components/admin/ColorPaletteManager";

export default async function AdminColorsPage() {
  const t = await getTranslations("Admin");
  await connectDB();
  const colors = await Color.find().sort({ createdAt: 1 }).lean();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl font-bold uppercase tracking-[0.04em]">{t("colorsPage.title")}</h1>
      <ColorPaletteManager initialColors={JSON.parse(JSON.stringify(colors))} />
    </div>
  );
}
