import { defineConfig } from "vite";

export default defineConfig(({ command }) => ({
  base: command === "serve" ? "/" : "/spaceflamingo/",
  server: {
    port: 5173,
  },
}));
