import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

const artifactsDir = path.resolve(__dirname, "../artifacts");
const publicDir = fs.existsSync(artifactsDir) ? artifactsDir : path.resolve(__dirname, "public");

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir,
  server: {
    port: 3099,
    host: true,
    strictPort: false,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../core"),
        path.resolve(__dirname, "../artifacts"),
      ],
    },
  },
});
