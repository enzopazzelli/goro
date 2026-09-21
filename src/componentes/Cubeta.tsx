export function Cubeta({
  pct,
  color,
  bajo = false,
}: {
  pct: number;
  color: string;
  bajo?: boolean;
}) {
  const pctAcotado = Math.max(0, Math.min(100, pct));

  return (
    <div
      role="img"
      aria-label={`Cubeta al ${Math.round(pctAcotado)} por ciento`}
      className={`relative h-11 w-9 shrink-0 overflow-hidden rounded-(--radius-arco) border bg-superficie-honda ${
        bajo ? "border-alerta shadow-[0_0_0_2px_var(--alerta-fondo)]" : "border-linea"
      }`}
    >
      <div
        className="absolute inset-x-0 bottom-0 transition-[height]"
        style={{ height: `${pctAcotado}%`, backgroundColor: color }}
      />
    </div>
  );
}
