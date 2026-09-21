export function Punto({ color, grande = false }: { color: string; grande?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 rounded-full border border-marco/20 align-[-2px] ${
        grande ? "h-[22px] w-[22px]" : "h-3.5 w-3.5"
      }`}
      style={{ backgroundColor: color }}
    />
  );
}
