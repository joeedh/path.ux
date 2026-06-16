/**
 * Codemod: convert an xmlpage XML file to a path.ux JSX (.tsx) component.
 *
 *   node buildtools/xml-to-tsx.mjs <input.xml> [--out <file.tsx>]
 *                                  [--name <ComponentName>] [--import <specifier>]
 *
 * Without --out the .tsx source is printed to stdout. The output is a starting
 * point — review it: xmlpage is permissive (it silently ignores unknown
 * attributes), whereas the typed JSX intrinsics may reject attributes the
 * original markup got away with (e.g. `label` on <tool>).
 *
 * A minimal, case-preserving XML parser is used on purpose: xmlpage parses with
 * the browser's application/xml DOMParser, so tag/attribute case matters
 * (`toolPanel`, `useIcons`, `massSetPath`), which an HTML parser would clobber.
 */
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { pathToFileURL } from "node:url";

// ---------------------------------------------------------------- XML parser

/** Parse a simple, well-formed XML fragment into a node tree. */
export function parseXml(src) {
  let i = 0;
  const n = src.length;

  function isSpace(c) {
    return c === " " || c === "\t" || c === "\r" || c === "\n";
  }
  function skipSpace() {
    while (i < n && isSpace(src[i])) i++;
  }

  function parseNodes(stopTag) {
    const out = [];
    while (i < n) {
      if (src.startsWith("<!--", i)) {
        const end = src.indexOf("-->", i + 4);
        i = end === -1 ? n : end + 3;
        continue;
      }
      if (src.startsWith("</", i)) {
        const end = src.indexOf(">", i);
        const name = src.slice(i + 2, end).trim();
        i = end + 1;
        if (stopTag !== undefined && name !== stopTag) {
          throw new Error(`mismatched closing tag </${name}> (expected </${stopTag}>)`);
        }
        return out;
      }
      if (src[i] === "<") {
        out.push(parseElement());
        continue;
      }
      // text run up to the next '<'
      const next = src.indexOf("<", i);
      const text = src.slice(i, next === -1 ? n : next);
      if (text.trim().length > 0) {
        out.push({ type: "text", value: decodeEntities(text) });
      }
      i = next === -1 ? n : next;
    }
    if (stopTag !== undefined) {
      throw new Error(`unexpected EOF, expected </${stopTag}>`);
    }
    return out;
  }

  function parseElement() {
    i++; // consume '<'
    let name = "";
    while (i < n && !isSpace(src[i]) && src[i] !== ">" && src[i] !== "/") {
      name += src[i++];
    }
    const attrs = [];
    for (;;) {
      skipSpace();
      if (src[i] === "/" && src[i + 1] === ">") {
        i += 2;
        return { type: "element", name, attrs, children: [], selfClosed: true };
      }
      if (src[i] === ">") {
        i++;
        const children = parseNodes(name);
        return { type: "element", name, attrs, children, selfClosed: false };
      }
      // attribute
      let key = "";
      while (i < n && !isSpace(src[i]) && src[i] !== "=" && src[i] !== ">" && src[i] !== "/") {
        key += src[i++];
      }
      if (!key) {
        throw new Error(`malformed attribute near: ${src.slice(i, i + 20)}`);
      }
      skipSpace();
      let value = "";
      if (src[i] === "=") {
        i++;
        skipSpace();
        const quote = src[i];
        if (quote === '"' || quote === "'") {
          i++;
          const end = src.indexOf(quote, i);
          value = src.slice(i, end === -1 ? n : end);
          i = end === -1 ? n : end + 1;
        } else {
          while (i < n && !isSpace(src[i]) && src[i] !== ">" && src[i] !== "/") {
            value += src[i++];
          }
        }
        value = decodeEntities(value);
      } else {
        value = key; // valueless attribute -> boolean
      }
      attrs.push({ key, value });
    }
  }

  skipSpace();
  return parseNodes(undefined);
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

// ----------------------------------------------------------------- emitter

function emitAttr({ key, value }) {
  if (!value.includes('"')) {
    return `${key}="${value}"`;
  }
  // value contains a double quote -> use a JSX expression with a single-quoted string
  return `${key}={${JSON.stringify(value)}}`;
}

function emitText(value) {
  const t = value.trim();
  if (/[{}<>]/.test(t)) {
    return `{${JSON.stringify(t)}}`;
  }
  return t;
}

function emitNode(node, indent, usedFragment) {
  const pad = "  ".repeat(indent);
  if (node.type === "text") {
    return pad + emitText(node.value);
  }

  const attrs = node.attrs.map(emitAttr).join(" ");
  const open = attrs ? `<${node.name} ${attrs}` : `<${node.name}`;

  const kids = node.children.filter((c) => c.type !== "text" || c.value.trim().length > 0);
  if (kids.length === 0) {
    return `${pad}${open} />`;
  }

  const inner = kids.map((c) => emitNode(c, indent + 1, usedFragment)).join("\n");
  return `${pad}${open}>\n${inner}\n${pad}</${node.name}>`;
}

/** Convert xmlpage XML source to a .tsx component module. */
export function xmlToTsx(xml, options = {}) {
  const name = options.name ?? "Page";
  const importSpecifier = options.importSpecifier ?? "pathux";

  const roots = parseXml(xml).filter((c) => c.type !== "text" || c.value.trim().length > 0);

  const usedFragment = roots.length !== 1;
  let body;
  if (usedFragment) {
    const inner = roots.map((r) => emitNode(r, 3, usedFragment)).join("\n");
    body = `    <>\n${inner}\n    </>`;
  } else {
    body = emitNode(roots[0], 2, usedFragment).replace(/^ {4}/, "");
    body = "    " + body.trimStart();
  }

  const imports = usedFragment ? "{ jsx, Fragment }" : "{ jsx }";

  return (
    `import ${imports} from ${JSON.stringify(importSpecifier)};\n\n` +
    `export function ${name}() {\n` +
    `  return (\n` +
    `${body}\n` +
    `  );\n` +
    `}\n`
  );
}

// --------------------------------------------------------------------- CLI

function toComponentName(file) {
  const base = basename(file).replace(/\.[^.]+$/, "");
  const camel = base.replace(/[^A-Za-z0-9]+(.)?/g, (_, c) => (c ? c.toUpperCase() : ""));
  return camel.charAt(0).toUpperCase() + camel.slice(1) || "Page";
}

async function main(argv) {
  let input;
  let out;
  let name;
  let importSpecifier;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out = argv[++i];
    else if (argv[i] === "--name") name = argv[++i];
    else if (argv[i] === "--import") importSpecifier = argv[++i];
    else input = argv[i];
  }

  if (!input) {
    console.error(
      "usage: node buildtools/xml-to-tsx.mjs <input.xml> [--out f.tsx] [--name N] [--import spec]"
    );
    process.exitCode = 1;
    return;
  }

  const xml = await readFile(input, "utf8");
  const tsx = xmlToTsx(xml, { name: name ?? toComponentName(input), importSpecifier });

  if (out) {
    await writeFile(out, tsx, "utf8");
    console.log(`[xml-to-tsx] wrote ${out}`);
  } else {
    process.stdout.write(tsx);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((err) => {
    console.error("[xml-to-tsx]", err?.stack ?? err);
    process.exitCode = 1;
  });
}
