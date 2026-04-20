import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  minify: true,
  clean: true,
  entry: ["./src/background.ts", "./src/popup.ts", "./src/content.ts"],
  platform: "browser",
  deps: {
    alwaysBundle: ["octokit", "@unveil/identity"],
  },
});
