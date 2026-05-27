import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const watch = process.argv.includes("--watch");

const external = ["fs", "path", "electron", "marked", "parse5", "path", "diff"];

let onEndPlugin = {
  name: "onEndPlugin",
  setup(build) {
    build.onEnd((result) => {
      fs.writeFileSync("dist/pathux.meta.json", JSON.stringify(result.metafile));
    });
  },
};

// Copies the bundled example app into example/dist so electron can load it
// relative to the example/ folder.
let copyExamplePlugin = {
  name: "copyExamplePlugin",
  setup(build) {
    build.onEnd(() => {
      console.log('built')
      fs.mkdirSync("example/dist", {recursive: true});

      for (let name of ["app.js", "app.js.map"]) {
        let src = path.join("dist/example", name);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join("example/dist", name));
        }
      }
    });
  },
};

const libCtx = await esbuild.context({
  entryPoints: ["scripts/pathux.ts", "scripts/pathux_with_docbrowser.ts"],
  outdir     : "dist",
  sourcemap  : "linked",
  bundle     : true,
  target     : "es2022",
  format     : "esm",
  external,
  treeShaking: false,
  metafile   : true,
  plugins    : [onEndPlugin],
});

const exampleCtx = await esbuild.context({
  entryPoints: [{in: "example/core/app.ts", out: "example/app"}],
  outdir     : "dist",
  sourcemap  : "linked",
  bundle     : true,
  target     : "es2022",
  format     : "esm",
  external,
  treeShaking: false,
  plugins    : [copyExamplePlugin],
});

if (watch) {
  await libCtx.watch();
  await exampleCtx.watch();
} else {
  await libCtx.rebuild();
  await exampleCtx.rebuild();
  libCtx.dispose();
  exampleCtx.dispose();
}
