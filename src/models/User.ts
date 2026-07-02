import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const addressSchema = new Schema(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    city: { type: String, required: true },
    wilaya: { type: String },
    postalCode: { type: String },
    country: { type: String, required: true, default: "Algérie" },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true }
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: false },
    role: { type: String, enum: ["client", "admin"], default: "client" },
    phone: { type: String },
    addresses: { type: [addressSchema], default: [] },
    locale: { type: String, enum: ["fr", "en", "ar"], default: "fr" },
    image: { type: String },
    emailVerified: { type: Date },
  },
  { timestamps: true }
);

export type IUser = InferSchemaType<typeof userSchema>;

export const User: Model<IUser> = models.User ?? model<IUser>("User", userSchema);
