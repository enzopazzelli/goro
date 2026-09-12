/* Las variables se leen por su nombre literal y no desde un índice dinámico:
   Next reemplaza `process.env.NEXT_PUBLIC_*` en el bundle del navegador solo
   si lo ve escrito tal cual.

   Se exigen dentro de funciones, nunca al importar el módulo, para que el
   proyecto compile y buildee sin `.env.local` — solo falla cuando algo
   realmente intenta hablar con la base, y con un mensaje que dice qué hacer. */

function exigir(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(`Falta ${nombre}. Copiá .env.local.example a .env.local y completalo.`);
  }
  return valor;
}

export function urlSupabase(): string {
  return exigir("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function clavePublica(): string {
  return exigir("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
