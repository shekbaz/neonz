"use client";

import { useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-black/40">
        {images[active] && <Image src={images[active]} alt={name} fill className="object-cover" />}
      </div>
      {images.length > 1 && (
        <div className="mt-4 flex gap-2">
          {images.map((img, i) => (
            <button
              key={img}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-16 overflow-hidden rounded-lg border-2",
                active === i ? "border-primary" : "border-transparent opacity-70"
              )}
            >
              <Image src={img} alt={`${name} ${i + 1}`} fill className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
