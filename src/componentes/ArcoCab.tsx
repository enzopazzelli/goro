import type { ReactNode } from "react";

export function ArcoCab({ eyebrow, titulo }: { eyebrow: string; titulo: ReactNode }) {
  return (
    <div className="rounded-(--radius-arco) bg-marco px-4 pt-4 pb-3 text-center">
      <p className="font-mono text-xs tracking-[0.14em] text-fondo/70 uppercase">{eyebrow}</p>
      <h3 className="font-display text-lg font-bold text-fondo">{titulo}</h3>
    </div>
  );
}
