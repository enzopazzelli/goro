"use client";

import { useActionState, useEffect, useRef } from "react";

type EstadoConError = { error: string | null };

/**
 * Envuelve useActionState y limpia el formulario cuando la acción termina
 * sin error. Sirve para formularios de "crear algo" (se vacía después de
 * un alta exitosa) — no para formularios de "editar algo" (ahí NO se quiere
 * vaciar lo que se acaba de guardar).
 */
export function useAccionConReset<Estado extends EstadoConError>(
  accion: (previo: Awaited<Estado>, datos: FormData) => Promise<Estado>,
  inicial: Awaited<Estado>,
) {
  const [estado, accionEnvuelta, enviando] = useActionState(accion, inicial);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!estado.error) formRef.current?.reset();
  }, [estado]);

  return { estado, accion: accionEnvuelta, enviando, formRef };
}
