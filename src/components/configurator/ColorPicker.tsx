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
          aria-pressed={value === color.hex}
          className={cn(
            "h-9 w-9 rounded-full ring-offset-2 ring-offset-background transition-all enabled:hover:scale-110 disabled:opacity-40",
            value === color.hex && "scale-110 ring-2 ring-foreground/70"
          )}
          style={{ backgroundColor: color.hex, boxShadow: value === color.hex ? `0 0 14px ${color.hex}` : undefined }}
        />
      ))}
    </div>
  );
}
