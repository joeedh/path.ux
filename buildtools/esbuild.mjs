import esbuild from "esbuild";
import fs from "fs";

const watch = process.argv.includes("--watch");

let onEndPlugin = {
  name: "onEndPlugin",
  setup(build) {
    build.onEnd((result) => {
      fs.writeFileSync("dist/pathux.meta.json", JSON.stringify(result.metafile));
    });
  },
};

const ctx = await esbuild.context({
  entryPoints: ["scripts/pathux.ts", "scripts/pathux_with_docbrowser.ts"],
  outdir     : "dist",
  sourcemap  : "linked",
  bundle     : true,
  target     : "es2022",
  format     : "esm",
  external   : ["fs", "path", "electron", "marked", "parse5", "path", "diff"],
  treeShaking: false,
  metafile   : true,
  plugins    : [onEndPlugin],
});

if (watch) {
  await ctx.watch();
} else {
  await ctx.rebuild();
  ctx.dispose();
}
