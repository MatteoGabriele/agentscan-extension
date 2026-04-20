import { defineConfig } from "vite-plus/pack";

export default defineConfig({
  minify: true,
  clean: true,
  entry: ["./src/**/*.ts"],
  platform: "browser",
  deps: {
    alwaysBundle: ["octokit", "@unveil/identity"],
  },
});
