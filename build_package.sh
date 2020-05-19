#!/bin/bash

mkdir -p package
mkdir -p _package

echo Exporting clean repo...
git archive head --output pathux.tar

echo Building package. . .
cd _package
cp ../pathux.tar .
tar -xf pathux.tar

cp -r scripts *.png *.js *.json docs dist example index.html *.pem *.MD watch.py render_icons.py ../package

cd ..
rm -rf _package

echo "Done"

