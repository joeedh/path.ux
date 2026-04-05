import { terser } from "rollup-plugin-terser";
import typescript from "@rollup/plugin-typescript";

// rollup.config.js
export default {
  input: 'scripts/pathux.js',
  treeshake: false,
  inlineDynamicImports: true,
  output: {
    file: 'dist/pathux.min.js',
    format: 'es',
    sourcemap : true,
    inlineDynamicImports: true
    //mangle : false
  },
  plugins : [
    typescript({
      tsconfig: './tsconfig.json',
      noEmit: false,
      declaration: false,
      sourceMap: true,
    }),
    terser()
  ]
};