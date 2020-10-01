#!/bin/bash

VERSION=`cat package.json | grep version | sed 's/[" :,]//g' | sed 's/version//'`

git commit -a
echo $?
git pull
echo $?
git push
echo $?

echo Publishing $VERSION
echo $?
bash build.sh
echo $?

#bash build_docs.sh && \
bash build_package.sh
echo $?

cd package
echo $?

git commit -a
echo $?
git push
echo $?

echo "npm publish"
echo $?
npm publish
echo $?

#git tag -a $VERSION -m "Release $VERSION"
