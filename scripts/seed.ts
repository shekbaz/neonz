import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { Category } from "../src/models/Category";
import { Product } from "../src/models/Product";
import { User } from "../src/models/User";

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI n'est pas défini.");

  await mongoose.connect(uri);
  console.log("Connecté à MongoDB.");

  await Promise.all([Category.deleteMany({}), Product.deleteMany({})]);

  const categories = await Category.insertMany([
    {
      slug: "murales",
      translations: {
        fr: { name: "Enseignes murales" },
        en: { name: "Wall signs" },
        ar: { name: "لافتات جدارية" },
      },
      order: 1,
    },
    {
      slug: "citations",
      translations: {
        fr: { name: "Citations" },
        en: { name: "Quotes" },
        ar: { name: "اقتباسات" },
      },
      order: 2,
    },
    {
      slug: "logos",
      translations: {
        fr: { name: "Logos d'entreprise" },
        en: { name: "Business logos" },
        ar: { name: "شعارات الأعمال" },
      },
      order: 3,
    },
  ]);

  await Product.insertMany([
    {
      slug: "good-vibes-only",
      translations: {
        fr: { name: "Good Vibes Only", description: "Enseigne néon rose vif, style cursif, parfaite pour un salon ou une chambre." },
        en: { name: "Good Vibes Only", description: "Bright pink neon sign, cursive style, perfect for a living room or bedroom." },
        ar: { name: "Good Vibes Only", description: "لافتة نيون وردية زاهية بخط مائل، مثالية لغرفة المعيشة أو غرفة النوم." },
      },
      category: categories[1]._id,
      images: ["https://res.cloudinary.com/demo/image/upload/v1690000000/neonz/good-vibes.png"],
      basePrice: 12500,
      colors: ["#FF2FC0"],
      dimensions: { width: 60, height: 25, unit: "cm" },
      stock: 15,
      isCustomizable: false,
      isFeatured: true,
      isActive: true,
    },
    {
      slug: "coeur-neon",
      translations: {
        fr: { name: "Cœur néon", description: "Un cœur lumineux rouge vif pour illuminer n'importe quel espace." },
        en: { name: "Neon heart", description: "A bright red glowing heart to light up any space." },
        ar: { name: "قلب نيون", description: "قلب أحمر مضيء لإضاءة أي مساحة." },
      },
      category: categories[0]._id,
      images: ["https://res.cloudinary.com/demo/image/upload/v1690000000/neonz/heart.png"],
      basePrice: 8900,
      colors: ["#FF073A"],
      dimensions: { width: 30, height: 30, unit: "cm" },
      stock: 20,
      isCustomizable: false,
      isFeatured: true,
      isActive: true,
    },
    {
      slug: "open-sign",
      translations: {
        fr: { name: "OPEN", description: "Enseigne néon classique 'OPEN' pour vitrine de commerce." },
        en: { name: "OPEN", description: "Classic 'OPEN' neon sign for shop windows." },
        ar: { name: "OPEN", description: "لافتة نيون كلاسيكية 'مفتوح' لواجهات المحلات." },
      },
      category: categories[0]._id,
      images: ["https://res.cloudinary.com/demo/image/upload/v1690000000/neonz/open.png"],
      basePrice: 9900,
      colors: ["#F5FBFF"],
      dimensions: { width: 50, height: 20, unit: "cm" },
      stock: 30,
      isCustomizable: false,
      isFeatured: true,
      isActive: true,
    },
  ]);

  const adminEmail = "admin@neonz.dz";
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("Admin1234!", 12);
    await User.create({
      name: "Admin NEONZ",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    console.log(`Compte admin créé : ${adminEmail} / Admin1234!`);
  }

  console.log("Seed terminé avec succès.");
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
