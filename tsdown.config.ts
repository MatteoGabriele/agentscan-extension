import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  exports: true,
  minify: true,
  clean: true,
  entry: ["./src/background.ts", "./src/popup.ts", "./src/content.ts"],
  platform: "browser",
});
