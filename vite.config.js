import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const rootDir = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
    plugins: [react()],

    build: {
        outDir: "dist",
        emptyOutDir: true,
        cssCodeSplit: true,

        rollupOptions: {
            input: {
                popup: resolve(rootDir, "index.html"),
                content: resolve(rootDir, "src/content/content.js"),
                background: resolve(rootDir, "src/background/service-worker.js")
            },

            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "chunks/[name].js",
                assetFileNames: "assets/[name][extname]"
            }
        }
    }
});