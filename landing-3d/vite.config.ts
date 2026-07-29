import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Vercel/estático: base relativa para funcionar en cualquier subruta.
  base: "./",
});
