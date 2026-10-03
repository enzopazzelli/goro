import type { ReactNode } from "react";

/**
 * Un enlace que baja un archivo. Es un <a> común y NO un <Link>: Next precarga
 * los <Link> visibles, y acá precargar es armar el Excel entero por nada.
 */
export function EnlaceDeDescarga({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center gap-2 rounded-(--r) border border-linea bg-superficie px-3 py-2 text-sm font-semibold transition hover:bg-superficie-honda"
    >
      <span aria-hidden="true">⬇</span>
      {children}
    </a>
  );
}
