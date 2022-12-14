import * as esbuild from "esbuild";

await esbuild.build({
  bundle: true,
  entryPoints: ["src/index.ts"],
  outfile: "lib/index.cjs",
  format: "cjs",
  platform: "node",
  target: "node14",
});
