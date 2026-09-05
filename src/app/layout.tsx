import type { Metadata, Viewport } from "next";
import { dato, display, texto } from "@/lib/fuentes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goro — Sistema de gestión",
  description: "Sistema de gestión para la heladería Goro.",
};

export const viewport: Viewport = {
  themeColor: "#2a1b12",
};

export default function LayoutRaiz({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${display.variable} ${texto.variable} ${dato.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
