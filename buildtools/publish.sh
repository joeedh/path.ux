#!/bin/bash

#ensure we're in right working directory
if [ ! -d "./buildtools" ]
then
cd ..
fi

VERSION=`cat package.json | grep version | sed 's/[" :,]//g' | sed 's/version//'`

git commit -a
echo $?
git pull
echo $?
git push
echo $?

echo Publishing $VERSION
echo $?
bash buildtools/build.sh
echo $?

#bash build_docs.sh && \
bash buildtools/build_package.sh
echo $?

cd _package
echo $?

echo "npm publish"
echo $?
npm publish
echo $?

cd ..
rm -rf _package
#git tag -a $VERSION -m "Release $VERSION"
