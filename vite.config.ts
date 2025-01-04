import copy from "rollup-plugin-copy";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    sourcemap: true,
    rollupOptions: {
      input: "src/main.ts",
      output: {
        dir: "dist",
        entryFileNames: "main.js",
        format: "es",
      },
    },
  },
  plugins: [
    copy({
      targets: [{ src: "./module.json", dest: "dist" },
      { src: "./src/roll-window.html", dest: "dist" },
      { src: "./src/lsm-style.css", dest: "dist" },
      { src: "./src/tables", dest: "dist" }
      ],
      hook: "writeBundle",
    }),
  ],
});