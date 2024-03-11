// rollup.config.js
export default {
  input: 'scripts/pathux.js',
  treeshake: false,
  inlineDynamicImports: true,
  output: {
    file: 'dist/pathux.js',
    format: 'es',
    sourcemap : true,
    inlineDynamicImports: true
  }
};