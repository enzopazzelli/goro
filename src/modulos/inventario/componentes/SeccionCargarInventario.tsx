import { SiPuede } from "@/modulos/auth/componentes/Permisos";
import { Tarjeta } from "@/componentes/Tarjeta";
import type { Sabor } from "@/lib/sabores";
import { FormularioProducto } from "@/modulos/productos/componentes/FormularioProducto";
import { listarInsumos } from "../consultas/insumos";
import { FormularioBalde } from "./FormularioBalde";
import { FormularioFormato } from "./FormularioFormato";
import { FormularioInsumo } from "./FormularioInsumo";
import { FormularioSabor } from "./FormularioSabor";
import { RecibirPorCodigo } from "./RecibirPorCodigo";

export async function SeccionCargarInventario({
  esDuenio,
  saboresActivos,
}: {
  esDuenio: boolean;
  saboresActivos: Sabor[];
}) {
  // Para buscar por nombre en Recibir mercadería: se filtra en el navegador, letra a letra.
  const insumos = await listarInsumos();

  return (
    <div className="flex flex-col gap-3">
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Sabor nuevo</h2>
          <FormularioSabor />
        </Tarjeta>
      )}
      <SiPuede permiso="cargar_inventario">
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Recibir mercadería</h2>
          <p className="text-sm text-texto-suave">
            Escaneá el código del artículo (o buscalo por nombre) y decí cuántos llegaron.
          </p>
          <RecibirPorCodigo insumos={insumos} />
        </Tarjeta>
      </SiPuede>
      <SiPuede permiso="cargar_inventario">
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Balde nuevo</h2>
          <FormularioBalde sabores={saboresActivos} />
        </Tarjeta>
      </SiPuede>
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Insumo nuevo</h2>
          <FormularioInsumo />
        </Tarjeta>
      )}
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Producto nuevo</h2>
          <FormularioProducto />
        </Tarjeta>
      )}
      {esDuenio && (
        <Tarjeta compacta>
          <h2 className="font-display text-base font-semibold">Formato nuevo</h2>
          <FormularioFormato />
        </Tarjeta>
      )}
    </div>
  );
}
