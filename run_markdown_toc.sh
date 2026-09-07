#!/usr/bin/env bash
find documentation/ -name '*.md' | while read -r file; do
  echo "Processing $file"
  npx markdown-toc --append "##NL##<!-- regenerate with pnpm markdown-toc -->" -i "$file"
  sed -i 's/##NL##/\
/g' "$file"
done

# markdown-toc writes "*" bullets and wraps its own way; prettier owns markdown style here,
# so hand the files back to it rather than leaving the two disagreeing
node node_modules/@pathtx/prettier/bin/prettier.cjs --log-level warn --write "documentation/**/*.md"
