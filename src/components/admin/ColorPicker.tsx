"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ColorOption {
  _id: string;
  name: string;
  hex: string;
}

export function ColorPicker({
  colors,
  selected,
  onChange,
}: {
  colors: ColorOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
}) {
  function toggle(hex: string) {
    onChange(selected.includes(hex) ? selected.filter((c) => c !== hex) : [...selected, hex]);
  }

  return (
    <div className="flex flex-wrap gap-3">
      {colors.map((color) => {
        const active = selected.includes(color.hex);
        return (
          <button
            key={color._id}
            type="button"
            onClick={() => toggle(color.hex)}
            title={color.name}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform",
              active ? "border-primary scale-110" : "border-border"
            )}
            style={{ backgroundColor: color.hex }}
          >
            {active && <Check className="h-4 w-4 text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" />}
          </button>
        );
      })}
    </div>
  );
}
