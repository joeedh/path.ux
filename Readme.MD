# path.ux

An HTML5 UI library with Blender-RNA-style data binding.

- [Demo](https://joeedh.github.io/path.ux/example/index.html)
- [Documentation](https://joeedh.github.io/path.ux/docs/index.html)
- [Documentation source](documentation/index.md)

# Setup

path.ux uses **pnpm** and carries submodules.

```bash
git submodule update --init --recursive
pnpm install
pnpm run build
```

# Running the example app

The example app under `example/` is the reference consumer. Launch it in NW.js or
Electron, each with the Chrome DevTools Protocol on port 9222:

```bash
pnpm nwjs
pnpm electron
```

Or serve it over http and open <http://localhost:5002>:

```bash
node serv.js
```

# Checks

```bash
pnpm run typecheck   # the library, then example/
pnpm run test        # vitest
pnpm run lint        # eslint + the comment prose linter
pnpm run format      # prettier
```
