"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
}) {
  const cajaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;
    function alTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", alTeclado);
    const primero = cajaRef.current?.querySelector<HTMLElement>("input, select, button");
    primero?.focus();
    return () => document.removeEventListener("keydown", alTeclado);
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-marco/55 p-4"
      onClick={(evento) => {
        if (evento.target === evento.currentTarget) onCerrar();
      }}
    >
      <div
        ref={cajaRef}
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="flex max-h-[92vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-(--r-grande) bg-fondo p-5 shadow-(--shadow-tarjeta)"
      >
        <h3 className="font-display text-lg font-bold">{titulo}</h3>
        {children}
      </div>
    </div>,
    document.body,
  );
}
