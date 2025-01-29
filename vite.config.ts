import copy from "rollup-plugin-copy";
import { defineConfig, Plugin } from "vite";
import * as fsPromises from "fs/promises";
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

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
      targets: [
        { src: "./src/roll-window.hbs", dest: "dist" },
        { src: "./src/lsm-style.css", dest: "dist" },
        { src: "./src/tables", dest: "dist" }
      ],
      hook: "writeBundle",
    }),
    updateModuleManifestPlugin(),
  ],
});

function updateModuleManifestPlugin(): Plugin {
  return {
    name: "update-module-manifest",
    async writeBundle(): Promise<void> {
      const moduleVersion = process.env.MODULE_VERSION;
      const githubProject = process.env.GH_PROJECT;
      const githubTag = process.env.GH_TAG;
      const manifestContents: string = await fsPromises.readFile(
        "src/module.json",
        "utf-8"
      );
      const manifestJson = JSON.parse(manifestContents) as Record<
        string,
        unknown
      >;
      if (moduleVersion) {
        manifestJson["version"] = moduleVersion;
      }
      if (githubProject) {
        const baseUrl = `https://github.com/${githubProject}/releases`;
        manifestJson["manifest"] = `${baseUrl}/latest/download/module.json`;
        if (githubTag) {
          manifestJson[
            "download"
          ] = `${baseUrl}/download/${githubTag}/module.zip`;
        }
      }

      await fsPromises.writeFile(
        "dist/module.json",
        JSON.stringify(manifestJson, null, 4)
      );
    },
  };
}