import { Boton } from "@/componentes/Boton";

/** El error de la acción y los dos botones. Los modales con formulario no se cierran con clic afuera, así que Cancelar es la salida. */
export function PieDeModal({
  error,
  enviando,
  onCancelar,
  texto,
  textoEnviando,
  peligro = false,
}: {
  error: string | null;
  enviando: boolean;
  onCancelar: () => void;
  texto: string;
  textoEnviando: string;
  peligro?: boolean;
}) {
  return (
    <>
      {error && (
        <p role="alert" className="text-sm text-alerta">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Boton type="button" variante="fantasma" onClick={onCancelar}>
          Cancelar
        </Boton>
        <Boton type="submit" variante={peligro ? "peligro" : "principal"} disabled={enviando}>
          {enviando ? textoEnviando : texto}
        </Boton>
      </div>
    </>
  );
}
