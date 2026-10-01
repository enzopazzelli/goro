import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { exigirDuenio } from "@/modulos/auth/consultas/perfil";
import { DetalleTurnoCerrado } from "@/modulos/caja/componentes/DetalleTurnoCerrado";
import { turnoPorId } from "@/modulos/caja/consultas/historial";

export const metadata = { title: "Turno de caja" };

export default async function TurnoDeCaja(props: PageProps<"/caja/turno/[id]">) {
  // Solo el dueño: acá se ven el esperado y la diferencia. La barrera real es
  // la RLS de `arqueos`; esto evita mostrarle a un colaborador un arqueo vacío.
  await exigirDuenio();

  const { id } = await props.params;
  const turnoId = Number(id);
  if (!Number.isInteger(turnoId) || turnoId <= 0) notFound();

  const turno = await turnoPorId(turnoId);
  if (!turno) notFound();
  // El turno abierto se ve (y se opera) en /caja, no acá.
  if (!turno.cerradoEn) redirect("/caja");

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <Link href="/caja" className="text-sm text-texto-suave underline">
          ← Caja
        </Link>
        <h1 className="font-display text-3xl font-bold">Turno #{turno.id}</h1>
      </header>

      <DetalleTurnoCerrado turno={turno} />
    </div>
  );
}
