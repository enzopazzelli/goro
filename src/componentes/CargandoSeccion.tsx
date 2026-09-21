export function CargandoSeccion({ titulo }: { titulo: string }) {
  return (
    <section className="flex flex-col gap-4 rounded-(--r-grande) border border-linea bg-superficie p-6">
      <h2 className="font-display text-lg font-semibold text-texto-suave">{titulo}</h2>
      <p className="text-sm text-texto-suave">Cargando…</p>
    </section>
  );
}
