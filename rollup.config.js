import typescript from "@rollup/plugin-typescript";

// rollup.config.js
export default {
  input: 'scripts/pathux.js',
  treeshake: false,
  inlineDynamicImports: true,
  plugins: [
    typescript({
      tsconfig: './tsconfig.json',
      noEmit: false,
      declaration: false,
      sourceMap: true,
    })
  ],
  output: {
    file: 'dist/pathux.js',
    format: 'es',
    sourcemap : true,
    inlineDynamicImports: true
  }
};