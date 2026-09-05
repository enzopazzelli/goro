import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/* El pedido del proyecto es "código corto y limpio". Eso no se sostiene con
   un documento que dice "sean prolijos": se sostiene con un linter que corta
   el build. En el sistema anterior (marlyn-minimarket) el panel de ventas
   terminó en 908 líneas y varios formularios arriba de 450 — ninguna regla lo
   impedía, así que pasó. Acá el techo es mecánico desde el primer commit.

   Los límites cuentan código real: los comentarios no penalizan, porque en
   este proyecto explicar el POR QUÉ es parte del trabajo. */
const limitesDeTamano = {
  "max-lines": ["error", { max: 200, skipBlankLines: true, skipComments: true }],
  "max-lines-per-function": ["error", { max: 100, skipBlankLines: true, skipComments: true }],
  "max-depth": ["error", 4],
  complexity: ["error", 12],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "supabase/.temp/**",
    "supabase/.branches/**",
    // El mockup de venta es HTML plano de una sola pieza, a propósito.
    // No es código del sistema y no se mide con esta vara.
    "index.html",
  ]),

  { rules: limitesDeTamano },

  {
    // Un test largo no es un test mal escrito: suele ser una tabla de casos.
    // Lo que no se negocia es que el código bajo test sea corto.
    files: ["**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "max-lines": ["error", { max: 400, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": "off",
    },
  },
]);

export default eslintConfig;
