import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "src/backend"),
      "@frontend": path.resolve(__dirname, "src/frontend"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@lib": path.resolve(__dirname, "src/lib")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  }
});
