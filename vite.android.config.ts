import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  configFile: false,
  base: "./",
  plugins: [tailwindcss(), react()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  build: { outDir: "dist-android", emptyOutDir: true, rollupOptions: { input: "android.html" } },
});
