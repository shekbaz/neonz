import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

const neonElementSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ["text", "draw", "line", "rect", "circle"], required: true },
    color: { type: String, required: true },
    glowIntensity: { type: Number, default: 60 },
    blink: { type: Boolean, default: false },

    // text / rect / circle
    x: { type: Number },
    y: { type: Number },
    rotation: { type: Number },

    // text
    content: { type: String },
    fontSize: { type: Number },
    fontId: { type: String },

    // draw
    points: { type: [{ x: Number, y: Number }], _id: false },

    // line
    x1: { type: Number },
    y1: { type: Number },
    x2: { type: Number },
    y2: { type: Number },

    // rect / circle
    width: { type: Number },
    height: { type: Number },
    radius: { type: Number },
  },
  { _id: false }
);

const customDesignSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User" },
    sessionId: { type: String }, // pour rattacher un design à un panier invité non connecté
    status: { type: String, enum: ["draft", "valid", "ordered"], default: "draft" },
    sourceType: { type: String, enum: ["image", "text", "draw", "mixed"], required: true },

    elements: { type: [neonElementSchema], default: [] },
    /** Export PNG du canvas au moment de la commande — affiché tel quel côté admin pour la fabrication. */
    previewImageUrl: { type: String, required: true },

    dimensions: {
      widthCm: { type: Number, required: true, max: 90 },
      heightCm: { type: Number, required: true, max: 90 },
    },
    pxToCmRatio: { type: Number, required: true },

    support: {
      type: String,
      enum: ["acrylic-transparent", "acrylic-black", "silhouette-cut"],
      default: "acrylic-transparent",
    },
    hasRemote: { type: Boolean, default: false },
    // Dérivé server-side de `elements.some(e => e.blink)` — jamais fourni par le client.
    hasController: { type: Boolean, default: false },

    price: {
      tubePrice: { type: Number, required: true },
      totalTubeLengthCm: { type: Number, required: true },
      supportSurcharge: { type: Number },
      remoteSurcharge: { type: Number },
      controllerSurcharge: { type: Number },
      total: { type: Number, required: true },
    },
  },
  { timestamps: true }
);

export type ICustomDesign = InferSchemaType<typeof customDesignSchema>;

export const CustomDesign: Model<ICustomDesign> =
  models.CustomDesign ?? model<ICustomDesign>("CustomDesign", customDesignSchema);
