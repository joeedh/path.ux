// rollup.config.js
export default {
  input: 'scripts/pathux.js',
  treeshake: false,
  output: {
    file: 'dist/pathux.js',
    format: 'es',
    sourcemap : true
  }
};