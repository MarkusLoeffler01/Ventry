import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "url";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(fileURLToPath(new URL("./", import.meta.url)), "src"),
      "@root": path.resolve(fileURLToPath(new URL("./", import.meta.url))),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
