// The document the Markdown tab opens: every block kind the provider renders, so one
// screenshot shows them all and the specs have something to select in.

export const MARKDOWN_SAMPLE = `---
title: Markdown sample
tags: [demo, richtext]
---

# The Markdown tab

A paragraph with *emphasis*, **strong text**, ~~a strikethrough~~, \`inline code\`, a
[link](https://example.com) and a [[Wiki page|wikilink]].
A second line after a soft break, and a hard one follows.\\
Here it is.

## Lists

- A bulleted item
- Another, with a nested run
  1. First nested step
  2. Second nested step
     - A bullet two levels down
     - And one more
  3. Third step, numbering resumed
- Back at the top level

1. Numbered item one
2. Numbered item two
   - [ ] A task inside it
   - [x] A finished task

## Quotes and code

> A quoted line.
> > Nested a level deeper.

\`\`\`ts
function greet(name: string) {
  return \`Hello, \${name}\`;
}
\`\`\`

---

| Column | Aligned right |
| ------ | ------------: |
| cell   |             1 |
| cell   |            22 |

<video src="trailer.mp4" controls></video>

![A tiny icon](myicon2.png) sits inline after the raw block, with \`width\` kept as HTML: <img src="myicon2.png" width="32" alt="the same, sized">.
`;
