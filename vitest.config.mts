import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

// .mts y no .ts: como ESM de verdad, sin que Vite lo cargue como CommonJS.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(import.meta.dirname, "./src") },
  },
  test: {
    environment: "jsdom",
    globals: true,
    // Sin prefijo: los tests de RLS necesitan SUPABASE_SERVICE_ROLE_KEY, que
    // nunca lleva NEXT_PUBLIC_ porque no se expone al navegador.
    env: loadEnv("", process.cwd(), ""),
  },
});
