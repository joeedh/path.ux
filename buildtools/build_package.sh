#!/bin/bash

echo "If publishing a new version in npm make sure to run publish.sh instead of build_package.sh"

git commit -a

mkdir -p package
mkdir -p _package

echo Exporting clean repo...
rm pathux.tar 2> /dev/null
git archive head --output pathux.tar

echo Building package. . .
cd _package
cp ../pathux.tar .
tar -xf pathux.tar

ls
cp -r scripts simple_docsys *.js *.json dist *.MD ../package
rm -rf ../package/docs
cp -r docs_src ../package/docs
rm ../package/docs/.esdoc.json

cd ..
rm -rf _package

echo "Done"

