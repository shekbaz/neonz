import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const neonPathSchema = new Schema(
  {
    id: { type: String, required: true },
    d: { type: String, required: true },
    color: { type: String, required: true },
    order: { type: Number, required: true },
    groupId: { type: String },
    glowIntensity: { type: Number, default: 60 },
    blink: { type: Boolean, default: false },
  },
  { _id: false }
);

const collisionZoneSchema = new Schema(
  {
    pathIds: { type: [String], required: true },
    minDistanceCm: { type: Number, required: true },
    atPoint: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  },
  { _id: false }
);

const customDesignSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String }, // pour rattacher un design à un panier invité non connecté
    status: { type: String, enum: ["draft", "valid", "ordered"], default: "draft" },
    sourceType: { type: String, enum: ["image", "text", "draw", "mixed"], required: true },

    sourceImageUrl: { type: String },
    sourceText: { type: String },
    fontFamily: { type: String },

    paths: { type: [neonPathSchema], default: [] },

    dimensions: {
      widthCm: { type: Number, required: true, max: 90 },
      heightCm: { type: Number, required: true, max: 90 },
    },
    pxToCmRatio: { type: Number, required: true },

    collision: {
      hasCollision: { type: Boolean, default: false },
      zones: { type: [collisionZoneSchema], default: [] },
      lastCheckedAt: { type: Date },
    },

    support: {
      type: String,
      enum: ["acrylic-transparent", "acrylic-black", "silhouette-cut"],
      default: "acrylic-transparent",
    },
    hasRemote: { type: Boolean, default: false },
    // Dérivé server-side de `paths.some(p => p.blink)` — jamais fourni par le client.
    hasController: { type: Boolean, default: false },

    price: {
      base: { type: Number, required: true },
      fixedFee: { type: Number },
      tubePrice: { type: Number },
      colorSurcharge: { type: Number, required: true },
      sizeSurcharge: { type: Number, required: true },
      complexitySurcharge: { type: Number, required: true },
      supportSurcharge: { type: Number },
      remoteSurcharge: { type: Number },
      controllerSurcharge: { type: Number },
      total: { type: Number, required: true },
    },

    previewImageUrl: { type: String },
  },
  { timestamps: true }
);

export type ICustomDesign = InferSchemaType<typeof customDesignSchema>;

export const CustomDesign: Model<ICustomDesign> =
  models.CustomDesign ?? model<ICustomDesign>("CustomDesign", customDesignSchema);
