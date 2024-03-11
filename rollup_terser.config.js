import { terser } from "rollup-plugin-terser";

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
  plugins : [terser()]
};