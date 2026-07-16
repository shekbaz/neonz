import { connectDB } from "@/lib/db";
import { Color } from "@/models/Color";
import { ConfiguratorWorkspace } from "@/components/configurator/ConfiguratorWorkspace";
import { getPricingSettings } from "@/lib/neon/getPricingSettings";

export default async function ConfiguratorPage() {
  await connectDB();
  const [colors, pricingSettings] = await Promise.all([Color.find().sort({ createdAt: 1 }).lean(), getPricingSettings()]);

  return <ConfiguratorWorkspace initialColors={JSON.parse(JSON.stringify(colors))} pricingSettings={pricingSettings} />;
}
