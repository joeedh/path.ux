import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const ctx = await esbuild.context({
  entryPoints: ["scripts/pathux.js", "scripts/pathux_with_docbrowser.js"],
  outdir     : "dist",
  sourcemap  : "inline",
  bundle     : true,
  target     : "es2022",
  format     : "esm",
  external   : ["fs", "path"],
  treeShaking: false,
});

if (watch) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  ctx.dispose()
}
