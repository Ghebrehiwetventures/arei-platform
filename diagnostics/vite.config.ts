import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  publicDir: path.resolve(__dirname, "../artifacts"),
  server: {
    port: 3099,
    fs: {
      allow: [
        path.resolve(__dirname),
        path.resolve(__dirname, "../core"),
        path.resolve(__dirname, "../artifacts"),
      ],
    },
  },
});
