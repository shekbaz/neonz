"use client";

import { NEON_COLORS } from "@/types/neon";
import { cn } from "@/lib/utils";

export function ColorPicker({
  value,
  onChange,
  disabled,
}: {
  value?: string;
  onChange: (hex: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {NEON_COLORS.map((color) => (
        <button
          key={color.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(color.hex)}
          title={color.label}
          className={cn(
            "h-9 w-9 rounded-full border-2 transition-transform enabled:hover:scale-110 disabled:opacity-40",
            value === color.hex ? "border-foreground" : "border-transparent"
          )}
          style={{ backgroundColor: color.hex, boxShadow: value === color.hex ? `0 0 10px ${color.hex}` : undefined }}
        />
      ))}
    </div>
  );
}
