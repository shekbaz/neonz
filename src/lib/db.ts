import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// En dev, Next.js recharge les modules à chaud : on met le cache de connexion
// sur `global` pour éviter d'ouvrir une nouvelle connexion Mongoose à chaque HMR.
declare global {
  var __neonzMongooseCache: MongooseCache | undefined;
}

const cache: MongooseCache = global.__neonzMongooseCache ?? { conn: null, promise: null };
global.__neonzMongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI n'est pas défini dans les variables d'environnement.");
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
