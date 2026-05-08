/**
 * Vite config for Capacitor (mobile) builds.
 *
 * Unlike vite.config.ts, this does not require PORT or BASE_PATH env vars
 * and omits Replit-specific dev plugins so the output is a clean static
 * bundle suitable for packaging by Capacitor.
 *
 * Build command:
 *   pnpm --filter @workspace/dutton-toolkit run cap:build
 *
 * After building, run:
 *   pnpm --filter @workspace/dutton-toolkit exec cap sync
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(
        import.meta.dirname,
        "..",
        "..",
        "attached_assets",
      ),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },
  define: {
    "import.meta.env.BASE_URL": JSON.stringify("/"),
  },
});
