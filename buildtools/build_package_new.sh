#!/usr/bin/env bash

git commit -a
git push

if [ -d _package ]; then
  rm -rf _package
fi
if [ -d types ]; then
  rm -rf types
fi

rm -rf dist

pnpm build || exit 1
pnpm typecheck || exit 1
pnpm emitTypes 

mkdir -p _package
cp -r scripts simple_docsys package.json tsconfig.json pnpm-lock.yaml pathux.d.ts Readme.MD types _package
cp -r dist _package/bundle
cp package_dist.json _package/package.json

