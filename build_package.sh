#!/bin/bash

mkdir -p package
mkdir -p _package

echo Exporting clean repo...
rm pathux.tar 2> /dev/null
git archive head --output pathux.tar

echo Building package. . .
cd _package
cp ../pathux.tar .
tar -xf pathux.tar

cp -r scripts *.png *.js *.json dist example index.html *.pem *.MD watch.py render_icons.py ../package
rm -rf ../package/docs
cp -r docs_src ../package/docs
rm ../package/docs/.esdoc.json

cd ..
rm -rf _package

echo "Done"

