import { DM_Mono, Familjen_Grotesk, Hanken_Grotesk } from "next/font/google";

/* Las tres del mockup, servidas por Next en vez de por un <link> a Google:
   el local puede quedarse sin internet y el sistema tiene que verse igual.
   Cada una se expone como variable CSS y se consume desde globals.css. */

export const display = Familjen_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--fuente-display",
});

export const texto = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-texto",
});

/* Plata, kilos y códigos de barras: monoespaciada para que las cifras se
   comparen en columna y un código tipeado a mano no se lea mal. */
export const dato = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--fuente-dato",
});
