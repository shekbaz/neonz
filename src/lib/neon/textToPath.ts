import fs from "node:fs/promises";
import path from "node:path";
import * as opentype from "opentype.js";
import type { Font } from "opentype.js";
import type { NeonPath } from "@/types/neon";
import { NEON_COLORS, NEON_FONTS, type NeonFontId } from "@/types/neon";

/**
 * Conversion d'un texte en tracés SVG (un tracé par caractère) via la police
 * vectorielle choisie. Chaque lettre reste un NeonPath séparé afin que
 * l'utilisateur puisse lui assigner une couleur individuelle et que le
 * moteur de collision (collision.ts) puisse détecter les rapprochements
 * excessifs entre lettres voisines (ex: "m", "w", accents, ponctuation).
 */

const fontCache = new Map<NeonFontId, Font>();

async function loadFont(fontId: NeonFontId): Promise<Font> {
  const cached = fontCache.get(fontId);
  if (cached) return cached;

  const fontDef = NEON_FONTS.find((f) => f.id === fontId);
  if (!fontDef) throw new Error(`Police néon inconnue: ${fontId}`);

  const absolutePath = path.join(process.cwd(), "public", fontDef.file);
  const buffer = await fs.readFile(absolutePath);
  const font = opentype.parse(
    buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
  );

  fontCache.set(fontId, font);
  return font;
}

export interface TextToPathOptions {
  fontId: NeonFontId;
  fontSizePx?: number;
  /** Espacement additionnel entre lettres, en px, au-delà du kerning natif de la police
   *  (levier utilisé par l'auto-ajustement en cas de collision détectée). */
  extraLetterSpacingPx?: number;
}

export interface TextToPathResult {
  paths: NeonPath[];
  workspaceWidthPx: number;
  workspaceHeightPx: number;
}

const DEFAULT_FONT_SIZE_PX = 200;

export async function textToNeonPaths(
  text: string,
  options: TextToPathOptions
): Promise<TextToPathResult> {
  if (!text.trim()) {
    throw new Error("Le texte ne peut pas être vide.");
  }

  const font = await loadFont(options.fontId);
  const fontSize = options.fontSizePx ?? DEFAULT_FONT_SIZE_PX;
  const extraSpacing = options.extraLetterSpacingPx ?? 0;
  const scale = fontSize / font.unitsPerEm;

  const chars = Array.from(text);
  const paths: NeonPath[] = [];

  let cursorX = 0;
  const ascent = font.ascender * scale;
  const descent = Math.abs(font.descender * scale);

  chars.forEach((char, index) => {
    const glyph = font.charToGlyph(char);
    const glyphPath = glyph.getPath(cursorX, ascent, fontSize);

    if (char.trim().length > 0) {
      paths.push({
        id: `char-${index}`,
        d: glyphPath.toPathData(3),
        color: NEON_COLORS[0].hex,
        order: index,
        groupId: "text",
      });
    }

    const advance = (glyph.advanceWidth ?? 0) * scale;
    let kerning = 0;
    const nextChar = chars[index + 1];
    if (nextChar) {
      const nextGlyph = font.charToGlyph(nextChar);
      kerning = font.getKerningValue(glyph, nextGlyph) * scale;
    }
    cursorX += advance + kerning + extraSpacing;
  });

  return {
    paths,
    workspaceWidthPx: Math.max(cursorX, 1),
    workspaceHeightPx: ascent + descent,
  };
}

/**
 * Ré-applique un espacement supplémentaire aux lettres — utilisé comme
 * remédiation automatique proposée à l'utilisateur quand une collision
 * inter-lettres est détectée (voir collision.ts / suggestAdjustments).
 */
export async function textToNeonPathsWithMoreSpacing(
  text: string,
  options: TextToPathOptions,
  additionalSpacingPx: number
): Promise<TextToPathResult> {
  return textToNeonPaths(text, {
    ...options,
    extraLetterSpacingPx: (options.extraLetterSpacingPx ?? 0) + additionalSpacingPx,
  });
}
