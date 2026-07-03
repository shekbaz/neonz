"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-foreground/10">
        {images[active] && <Image src={images[active]} alt={name} fill className="object-cover" />}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-2.5">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-foreground/10 transition-all",
                active === i
                  ? "ring-2 ring-primary dark:shadow-[0_0_14px_-2px_var(--color-primary)]"
                  : "opacity-60 hover:opacity-100"
              )}
              aria-label={`${name} ${i + 1}`}
              aria-current={active === i}
            >
              <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
