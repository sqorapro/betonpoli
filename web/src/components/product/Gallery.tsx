"use client";

import { useState } from "react";
import { ProductImage } from "@/components/ProductImage";
import { imageUrl } from "@/lib/format";
import type { PackUnit } from "@/generated/prisma/enums";

type Img = { path: string; alt: string };

export function Gallery({ images, alt, unit }: { images: Img[]; alt: string; unit: PackUnit }) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? null;

  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row md:gap-4">
      {images.length > 1 && (
        <div className="flex gap-3 overflow-x-auto md:flex-col">
          {images.map((img, i) => (
            <button
              key={img.path}
              type="button"
              aria-label={`Фото ${i + 1}`}
              aria-current={i === active}
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 cursor-pointer bg-tile md:h-[72px] md:w-[72px] ${i === active ? "outline outline-1 -outline-offset-1 outline-ink" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl(img.path, "sm")} alt="" className="h-full w-full object-contain p-1 mix-blend-multiply" />
            </button>
          ))}
        </div>
      )}
      <ProductImage image={current} alt={alt} unit={unit} size="lg" priority sizes="(min-width: 1024px) 55vw, 100vw" className="flex-1" />
    </div>
  );
}
