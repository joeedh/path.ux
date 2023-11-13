#!/bin/bash

echo "If publishing a new version in npm make sure to run publish.sh instead of build_package.sh"

git commit -a
git push

rm -rf _package

echo Exporting clean repo...
git clone . _package

cd _package
git submodule init
git submodule update --recursive

rm -rf .git
rm -rf scripts/path-controller/.git

rm serv*.js
rm rollup*.js
rm -rf docs docs_src githooks servers buildtools simple_example example .editorconfig .git*


