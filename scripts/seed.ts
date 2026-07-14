import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
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
      image: "/demo/cat-murales.svg",
      order: 1,
    },
    {
      slug: "citations",
      translations: {
        fr: { name: "Citations" },
        en: { name: "Quotes" },
        ar: { name: "اقتباسات" },
      },
      image: "/demo/cat-citations.svg",
      order: 2,
    },
    {
      slug: "logos",
      translations: {
        fr: { name: "Logos d'entreprise" },
        en: { name: "Business logos" },
        ar: { name: "شعارات الأعمال" },
      },
      image: "/demo/cat-logos.svg",
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
      images: ["/demo/good-vibes.svg"],
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
      images: ["/demo/heart.svg"],
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
      images: ["/demo/open.svg"],
      basePrice: 9900,
      colors: ["#F5FBFF"],
      dimensions: { width: 50, height: 20, unit: "cm" },
      stock: 30,
      isCustomizable: false,
      isFeatured: true,
      isActive: true,
    },
  ]);

  const adminEmail = process.env.SEED_ADMIN_EMAIL?.toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    throw new Error(
      "SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD doivent être définis dans l'environnement."
    );
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12);
  const existingAdmin = await User.findOne({ email: adminEmail });
  if (!existingAdmin) {
    await User.create({
      name: "Admin NEONZART",
      email: adminEmail,
      password: hashedPassword,
      role: "admin",
    });
    console.log(`Compte admin créé : ${adminEmail}`);
  } else {
    // Rejoue le seed pour tourner le mot de passe (ex: après une fuite de l'ancien).
    existingAdmin.password = hashedPassword;
    existingAdmin.role = "admin";
    await existingAdmin.save();
    console.log(`Mot de passe admin mis à jour : ${adminEmail}`);
  }

  console.log("Seed terminé avec succès.");
  await mongoose.disconnect();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
