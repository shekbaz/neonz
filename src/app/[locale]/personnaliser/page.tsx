import { connectDB } from "@/lib/db";
import { Color } from "@/models/Color";
import { ConfiguratorWorkspace } from "@/components/configurator/ConfiguratorWorkspace";

export default async function ConfiguratorPage() {
  await connectDB();
  const colors = await Color.find().sort({ createdAt: 1 }).lean();

  return <ConfiguratorWorkspace initialColors={JSON.parse(JSON.stringify(colors))} />;
}
