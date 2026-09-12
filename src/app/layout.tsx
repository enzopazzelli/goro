import type { Metadata, Viewport } from "next";
import { COLOR_NAVEGADOR, NOMBRE_COMERCIO } from "@/config/comercio";
import { dato, display, texto } from "@/lib/fuentes";
import "./globals.css";

export const metadata: Metadata = {
  // El template deja que cada pantalla ponga solo su nombre.
  title: {
    default: `${NOMBRE_COMERCIO} — Sistema de gestión`,
    template: `%s · ${NOMBRE_COMERCIO}`,
  },
  description: "Sistema de gestión para la heladería.",
};

export const viewport: Viewport = {
  themeColor: COLOR_NAVEGADOR,
};

export default function LayoutRaiz({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${display.variable} ${texto.variable} ${dato.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
