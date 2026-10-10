import { imageUrl } from "@/lib/format";
import type { PackUnit } from "@/generated/prisma/enums";

type Props = {
  image?: { path: string; alt: string } | null;
  alt: string;
  unit?: PackUnit;
  size?: "sm" | "md" | "lg";
  priority?: boolean;
  className?: string;
  /** атрибут sizes: какую ширину занимает картинка на экране */
  sizes?: string;
};

// Сетка: 2 колонки → 3 (≥360) → 4 (≥768) → 6 (≥1280)
export const GRID_SIZES = "(min-width: 1280px) 16vw, (min-width: 768px) 25vw, (min-width: 360px) 33vw, 50vw";

/** Квадрат с подложкой #f4f4f2. Пока фото нет — силуэт тары, как в макете. */
export function ProductImage({ image, alt, unit = "KG", size = "md", priority, className = "", sizes }: Props) {
  return (
    <div className={`relative aspect-square w-full overflow-hidden bg-tile ${className}`}>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- свои WebP-размеры, next/image не нужен
        <img
          src={imageUrl(image.path, size)}
          srcSet={`${imageUrl(image.path, "sm")} 240w, ${imageUrl(image.path, "md")} 640w, ${imageUrl(image.path, "lg")} 1000w`}
          sizes={sizes ?? GRID_SIZES}
          alt={image.alt || alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : undefined}
          decoding="async"
          className="absolute inset-0 h-full w-full object-contain p-[8%] mix-blend-multiply"
        />
      ) : (
        <Silhouette unit={unit} />
      )}
    </div>
  );
}

function Silhouette({ unit }: { unit: PackUnit }) {
  return (
    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full" role="img" aria-label="Фото скоро будет">
      <ellipse cx="100" cy="166" rx="46" ry="6" fill="#e2e2de" />
      {unit === "PCS" ? (
        <>
          <rect x="56" y="80" width="88" height="82" fill="#e6e6e1" />
          <path d="M56 80l14-18h60l14 18z" fill="#cfcfc9" />
          <rect x="70" y="100" width="60" height="30" fill="#111" />
        </>
      ) : unit === "L" ? (
        <>
          <rect x="64" y="58" width="72" height="104" rx="10" fill="#e6e6e1" />
          <rect x="80" y="46" width="18" height="14" fill="#111" />
          <path d="M108 58v-10h20v10" fill="none" stroke="#cfcfc9" strokeWidth="6" />
          <rect x="74" y="96" width="52" height="30" fill="#111" />
        </>
      ) : unit === "M" ? (
        <>
          <ellipse cx="100" cy="100" rx="52" ry="52" fill="#e6e6e1" />
          <ellipse cx="100" cy="100" rx="18" ry="18" fill="#f4f4f2" />
          <rect x="120" y="140" width="40" height="18" fill="#111" />
        </>
      ) : (
        <>
          <rect x="56" y="50" width="88" height="12" rx="3" fill="#cfcfc9" />
          <path d="M60 62h80l-8 100H68z" fill="#e6e6e1" />
          <rect x="72" y="92" width="56" height="34" fill="#111" />
        </>
      )}
    </svg>
  );
}
